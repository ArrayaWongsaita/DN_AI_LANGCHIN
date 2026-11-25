import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Document } from "@langchain/core/documents";
import { AIMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { InMemoryStore } from "@langchain/langgraph-checkpoint";
import pg from "pg";
import { afterAll, describe, expect, test } from "vitest";
import { chat } from "../workshops/part-12/solution/personal-assistant.js";
import { createFakeEmbeddings } from "../src/embeddings/fake.js";
import { indexCurriculum } from "../src/rag/curriculum-index.js";
import { createPgVectorStore, resetTable, upsertDocuments } from "../src/rag/pg-store.js";
import { createScriptedChatModel } from "../src/utils/scripted-model.js";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { savePreference } from "../src/memory/preferences.js";

describe("review fix 4: retry must not duplicate the user message in the checkpoint", () => {
  test("a 429 on the first model call leaves exactly one human message", async () => {
    const model = createScriptedChatModel([new AIMessage("ok")]);
    const m = model as unknown as { _generate: (...a: unknown[]) => Promise<unknown> };
    const orig = m._generate.bind(model);
    let n = 0;
    m._generate = async (...a) => {
      if (n++ === 0) throw Object.assign(new Error("rate limited"), { status: 429 });
      return orig(...a);
    };
    const checkpointer = new MemorySaver();
    const answer = await chat({ model, checkpointer, store: new InMemoryStore(), userId: "u1", conversationId: "c1", message: "hello" });
    expect(answer).toBe("ok");
    const tuple = await checkpointer.getTuple({ configurable: { thread_id: "user:u1:conv:c1" } });
    const msgs = (tuple?.checkpoint.channel_values.messages ?? []) as { getType(): string }[];
    expect(msgs.map((x) => x.getType())).toEqual(["human", "ai"]);
  });
});

describe("review fix 5: preference userId charset", () => {
  test("underscore userId is rejected (PostgresStore forbids it)", async () => {
    await expect(savePreference(new InMemoryStore(), "review_probe", "k", "v")).rejects.toThrow();
  });
});

const url = process.env.DATABASE_URL ?? (existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")).DATABASE_URL : undefined);
async function reachable(): Promise<boolean> {
  if (!url) return false;
  const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 1500 });
  pool.on("error", () => {});
  try { await pool.query("select 1"); return true; } catch { return false; } finally { await pool.end(); }
}
const dbUp = await reachable();

describe.skipIf(!dbUp)("review fixes 1-3 (pgvector)", () => {
  const pool = new pg.Pool({ connectionString: url });
  pool.on("error", () => {});
  const table = `test_final_${process.pid}`;
  afterAll(async () => {
    await pool.query(`drop table if exists ${table}`);
    await pool.end();
  });

  test("1: initialize failure rejects instead of hanging pool.end()", async () => {
    const p = new pg.Pool({ connectionString: url });
    p.on("error", () => {});
    await expect(createPgVectorStore({ embeddings: createFakeEmbeddings(), tableName: "user", pool: p })).rejects.toThrow();
    await Promise.race([p.end(), new Promise((_, rej) => setTimeout(() => rej(new Error("pool.end hung")), 4000))]);
  }, 10000);

  test("2: empty embeddings throw a retryable error and do not delete the old row", async () => {
    await resetTable(table, { pool });
    const good = await createPgVectorStore({ embeddings: createFakeEmbeddings(), tableName: table, pool });
    const doc = (t: string) => new Document({ pageContent: t, metadata: { source: "a", chunkIndex: 0 } });
    await upsertDocuments(good, [doc("เนื้อหาเดิม")]);
    const bad = await createPgVectorStore({ embeddings: { embedDocuments: async () => [[]], embedQuery: async () => [] } as never, tableName: table, pool });
    await expect(upsertDocuments(bad, [doc("เนื้อหาใหม่")])).rejects.toThrow(/embedding ของ/);
    const { rows } = await pool.query(`select count(*)::int as n from ${table}`);
    expect(rows[0].n).toBe(1);
  });

  test("3: re-index removes chunks that no longer exist", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cur-"));
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "a.md");
    writeFileSync(file, Array.from({ length: 40 }, (_, i) => `ข้อ ${i} นี่คือประโยคยาวพอสมควรสำหรับทดสอบการแบ่ง chunk ของเอกสาร`).join("\n\n"));
    await resetTable(table, { pool });
    const embeddings = createFakeEmbeddings();
    const first = await indexCurriculum({ embeddings, pool, tableName: table, dir });
    expect(first.chunks).toBeGreaterThan(2);
    writeFileSync(file, "ข้อความสั้นๆ ที่เหลืออยู่ในไฟล์นี้เท่านั้น ยาวเกินยี่สิบตัวอักษร");
    const second = await indexCurriculum({ embeddings, pool, tableName: table, dir });
    const { rows } = await pool.query(`select count(*)::int as n from ${table}`);
    expect(rows[0].n).toBe(second.chunks);
    expect(second.chunks).toBe(1);
  });
});
