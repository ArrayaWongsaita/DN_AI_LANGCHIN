import { parseArgs } from "node:util";
import type { Embeddings } from "@langchain/core/embeddings";
import type pg from "pg";
import { countingEmbeddings } from "../../../src/embeddings/counting.js";
import { createEmbeddings } from "../../../src/embeddings/index.js";
import { lessonDocuments } from "../../../src/rag/lessons.js";
import { createPgVectorStore, resetTable, upsertDocuments } from "../../../src/rag/pg-store.js";
import { withDb } from "../../../src/utils/db.js";
import { isMain } from "../../../src/utils/is-main.js";
import { retryAsync } from "../../../src/utils/retry.js";

export const LESSON_TABLE = "lessons";

interface Common {
  /** ใช้ embed เอกสาร (และ query ถ้าไม่ส่ง queryEmbeddings) */
  embeddings: Embeddings;
  queryEmbeddings?: Embeddings;
  pool: pg.Pool;
  tableName?: string;
}

/** index บทเรียนทั้งหมดลง pgvector (idempotent) — คืนจำนวนแถวและจำนวนข้อความที่ถูกส่งไป embed รอบนี้ */
export async function indexLessons(opts: Common): Promise<{ total: number; embedded: number }> {
  const tableName = opts.tableName ?? LESSON_TABLE;
  const counter = countingEmbeddings(opts.embeddings);
  const store = await createPgVectorStore({ embeddings: counter, tableName, pool: opts.pool });
  await upsertDocuments(store, lessonDocuments());
  const { rows } = await opts.pool.query(`select count(*)::int as n from ${tableName}`);
  return { total: rows[0].n, embedded: counter.documentsEmbedded };
}

export interface LessonHit {
  id: string;
  title: string;
  subject: string;
  grade: number;
  /** cosine similarity (1 = เหมือนที่สุด) */
  score: number;
}

/** ค้นบทเรียนตามความหมาย (กรองตามวิชาได้) */
export async function searchLessons(query: string, opts: Common & { subject?: string; topK?: number }): Promise<LessonHit[]> {
  const { topK = 3, subject } = opts;
  if (topK <= 0) throw new Error(`topK ต้องมากกว่า 0 (ได้ ${topK})`);
  if (!query.trim()) return [];
  const store = await createPgVectorStore({ embeddings: opts.embeddings, tableName: opts.tableName ?? LESSON_TABLE, pool: opts.pool });
  const qv = await (opts.queryEmbeddings ?? opts.embeddings).embedQuery(query);
  if (qv.length === 0) throw new Error("embedding ของ query ว่างเปล่า (provider ตอบผิดปกติ — มักเกิดจากโควตา free tier เต็ม รอ ~1 นาทีแล้วลองใหม่)");
  const rows = await store.similaritySearchVectorWithScore(qv, topK, subject ? { subject } : undefined);
  return rows.map(([d, distance]) => ({
    id: String(d.metadata.id),
    title: String(d.metadata.title),
    subject: String(d.metadata.subject),
    grade: Number(d.metadata.grade),
    score: 1 - distance, // pgvector cosine "distance" → similarity
  }));
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { subject: { type: "string" }, "top-k": { type: "string" }, reset: { type: "boolean" } },
  });
  const [command, ...rest] = positionals;
  try {
    await withDb(async (pool) => {
      if (command === "index") {
        if (values.reset) await resetTable(LESSON_TABLE, { pool });
        const r = await retryAsync(() => indexLessons({ embeddings: createEmbeddings("RETRIEVAL_DOCUMENT"), pool }), { delayMs: 15000 });
        console.log(`index เสร็จ: ${r.total} แถวในตาราง | ส่งไป embed รอบนี้: ${r.embedded} ข้อความ`);
      } else if (command === "search") {
        const query = rest.join(" ").trim();
        if (!query) throw new Error('ใช้: lesson-search.ts search "คำค้น" [--subject math] [--top-k 3]');
        const hits = await retryAsync(
          () =>
            searchLessons(query, {
              embeddings: createEmbeddings("RETRIEVAL_DOCUMENT"),
              queryEmbeddings: createEmbeddings("RETRIEVAL_QUERY"),
              pool,
              subject: values.subject,
              topK: values["top-k"] ? Number(values["top-k"]) : 3,
            }),
          { delayMs: 15000 },
        );
        console.log(`คำค้น: "${query}"${values.subject ? ` (วิชา ${values.subject})` : ""}`);
        if (hits.length === 0) console.log("(ไม่พบบทเรียนที่เกี่ยวข้อง)");
        hits.forEach((h, i) => console.log(`${i + 1}. [${h.subject} ม.${h.grade}] ${h.title}  (${h.id}, similarity ${h.score.toFixed(3)})`));
      } else {
        throw new Error('ใช้: lesson-search.ts index [--reset] | lesson-search.ts search "คำค้น" [--subject math] [--top-k 3]');
      }
    });
  } catch (e) {
    console.error("❌", (e as Error).message);
    process.exitCode = 1;
  }
}
