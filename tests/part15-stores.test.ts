import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import pg from "pg";
import { afterAll, describe, expect, test } from "vitest";
import { createFakeEmbeddings } from "../src/embeddings/fake.js";
import { assertTableName, createPgVectorStore, deleteBySource, documentId, resetTable, upsertDocuments } from "../src/rag/pg-store.js";

// ---------- ส่วนที่ไม่ต้องใช้ฐานข้อมูล ----------
const lessons = [
  new Document({ pageContent: "สมการเชิงเส้นตัวแปรเดียว", metadata: { source: "m1", subject: "math" } }),
  new Document({ pageContent: "เซลล์พืชและเซลล์สัตว์", metadata: { source: "s1", subject: "science" } }),
  new Document({ pageContent: "ประโยคสามัญในภาษาไทย", metadata: { source: "t1", subject: "thai" } }),
  new Document({ pageContent: "อัตราส่วนและร้อยละ", metadata: { source: "m2", subject: "math" } }),
];

describe("MemoryVectorStore with fake embeddings", () => {
  const make = () => MemoryVectorStore.fromDocuments(lessons, createFakeEmbeddings());
  test("similaritySearch returns top-K and finds the identical text first", async () => {
    const store = await make();
    const r = await store.similaritySearch("เซลล์พืชและเซลล์สัตว์", 2);
    expect(r).toHaveLength(2);
    expect(r[0].metadata.source).toBe("s1");
  });
  test("similaritySearchWithScore is ordered by score descending", async () => {
    const r = await (await make()).similaritySearchWithScore("อัตราส่วนและร้อยละ", 4);
    const scores = r.map(([, s]) => s);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores[0]).toBeCloseTo(1, 5);
  });
  test("metadata filter returns only matching subject", async () => {
    const r = await (await make()).similaritySearch("อะไรก็ได้", 10, (d) => d.metadata.subject === "math");
    expect(r.length).toBe(2);
    expect(r.every((d) => d.metadata.subject === "math")).toBe(true);
  });
  test("asRetriever({k}) returns at most k documents", async () => {
    const retriever = (await make()).asRetriever({ k: 2 });
    expect((await retriever.invoke("ภาษาไทย")).length).toBeLessThanOrEqual(2);
  });
});

describe("pg-store pure helpers", () => {
  test("assertTableName / resetTable reject unsafe names (SQL injection)", async () => {
    for (const bad of ["x; DROP TABLE users", "Users", "1abc", "a-b", "", "a b", 'a"b']) {
      expect(() => assertTableName(bad)).toThrow();
      await expect(resetTable(bad)).rejects.toThrow(/ชื่อตาราง/);
    }
    expect(() => assertTableName("lessons_v1")).not.toThrow();
  });
  test("documentId is a deterministic uuid per source+chunkIndex", () => {
    const a = new Document({ pageContent: "x", metadata: { source: "a.md", chunkIndex: 0 } });
    const a2 = new Document({ pageContent: "changed content", metadata: { source: "a.md", chunkIndex: 0 } });
    const b = new Document({ pageContent: "x", metadata: { source: "a.md", chunkIndex: 1 } });
    expect(documentId(a)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(documentId(a)).toBe(documentId(a2)); // id ผูกกับตำแหน่ง ไม่ใช่เนื้อหา → แก้เนื้อหาแล้ว "อัปเดต" ไม่ใช่เพิ่ม
    expect(documentId(a)).not.toBe(documentId(b));
  });
  test("documentId needs a source and a chunkIndex or id", () => {
    expect(() => documentId(new Document({ pageContent: "x", metadata: {} }))).toThrow();
    expect(documentId(new Document({ pageContent: "x", metadata: { id: "lesson-1" } }))).toMatch(/^[0-9a-f-]{36}$/);
  });
});

// ---------- ส่วนที่ต้องใช้ PostgreSQL + pgvector (ข้ามถ้าไม่มี DB) ----------
function databaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")).DATABASE_URL : undefined;
}
async function dbReachable(url: string | undefined): Promise<boolean> {
  if (!url) return false;
  const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 1500 });
  pool.on("error", () => {});
  try {
    await pool.query("select 1");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}
const url = databaseUrl();
const dbUp = await dbReachable(url);

describe.skipIf(!dbUp)("pgvector store (needs `docker compose up -d`)", () => {
  const pool = new pg.Pool({ connectionString: url });
  pool.on("error", () => {});
  const embeddings = createFakeEmbeddings();
  const table = `test_p15_${process.pid}`;
  const count = async () => Number((await pool.query(`select count(*) from ${table}`)).rows[0].count);
  const docs = (n: number, source: string) =>
    Array.from({ length: n }, (_, i) => new Document({ pageContent: `${source} ชิ้นที่ ${i}`, metadata: { source, chunkIndex: i, subject: source === "a.md" ? "math" : "science" } }));

  afterAll(async () => {
    await pool.query(`drop table if exists ${table}`);
    await pool.end();
  });

  test("upsert twice leaves the row count unchanged; changed content updates in place", async () => {
    await resetTable(table, { pool });
    const store = await createPgVectorStore({ embeddings, tableName: table, pool });
    const first = await upsertDocuments(store, [...docs(3, "a.md"), ...docs(2, "b.md")]);
    expect(first).toHaveLength(5);
    expect(await count()).toBe(5);
    await upsertDocuments(store, [...docs(3, "a.md"), ...docs(2, "b.md")]);
    expect(await count()).toBe(5);
    const changed = docs(3, "a.md");
    changed[1] = new Document({ pageContent: "เนื้อหาใหม่", metadata: changed[1].metadata });
    await upsertDocuments(store, changed);
    expect(await count()).toBe(5);
    const row = await pool.query(`select text as content from ${table} where metadata->>'source' = 'a.md' and (metadata->>'chunkIndex')::int = 1`);
    expect(row.rows[0].content).toBe("เนื้อหาใหม่");
  });

  test("deleteBySource removes only that source; metadata filter works", async () => {
    await resetTable(table, { pool });
    const store = await createPgVectorStore({ embeddings, tableName: table, pool });
    await upsertDocuments(store, [...docs(3, "a.md"), ...docs(2, "b.md")]);
    const onlyMath = await store.similaritySearch("a.md", 10, { subject: "math" });
    expect(onlyMath.length).toBe(3);
    expect(onlyMath.every((d) => d.metadata.subject === "math")).toBe(true);
    await deleteBySource(store, "a.md");
    expect(await count()).toBe(2);
    expect((await store.similaritySearch("x", 10)).every((d) => d.metadata.source === "b.md")).toBe(true);
  });

  test("a table created with another dimension fails with a friendly message", async () => {
    await resetTable(table, { pool });
    await createPgVectorStore({ embeddings, tableName: table, pool, dimensions: 8 });
    await expect(createPgVectorStore({ embeddings, tableName: table, pool })).rejects.toThrow(/8.*768|768.*8/);
  });

  test("upsert rejects duplicate ids inside one batch", async () => {
    await resetTable(table, { pool });
    const store = await createPgVectorStore({ embeddings, tableName: table, pool });
    const d = docs(1, "a.md");
    await expect(upsertDocuments(store, [d[0], d[0]])).rejects.toThrow(/ซ้ำ/);
  });
});

// ---------- Workshop: lesson search ----------
import { indexLessons, searchLessons } from "../workshops/part-15/solution/lesson-search.js";

describe.skipIf(!dbUp)("workshop lesson-search (needs `docker compose up -d`)", () => {
  const pool = new pg.Pool({ connectionString: url });
  pool.on("error", () => {});
  const table = `test_p15_lessons_${process.pid}`;
  const embeddings = createFakeEmbeddings();
  afterAll(async () => {
    await pool.query(`drop table if exists ${table}`);
    await pool.end();
  });

  test("indexing is idempotent: the second run embeds nothing and adds no rows", async () => {
    await resetTable(table, { pool });
    const first = await indexLessons({ embeddings, tableName: table, pool });
    expect(first.total).toBe(18);
    expect(first.embedded).toBe(18);
    const second = await indexLessons({ embeddings, tableName: table, pool });
    expect(second).toEqual({ total: 18, embedded: 0 });
  });
  test("search honours the subject filter and topK, and returns nothing for an unknown subject", async () => {
    const hits = await searchLessons("สมการ", { embeddings, tableName: table, pool, subject: "math", topK: 3 });
    expect(hits).toHaveLength(3);
    expect(hits.every((h) => h.subject === "math")).toBe(true);
    expect(await searchLessons("สมการ", { embeddings, tableName: table, pool, subject: "history" })).toEqual([]);
  });
  test("search rejects topK <= 0 and blank queries", async () => {
    await expect(searchLessons("x", { embeddings, tableName: table, pool, topK: 0 })).rejects.toThrow();
    expect(await searchLessons("   ", { embeddings, tableName: table, pool })).toEqual([]);
  });
});
