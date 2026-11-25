// Workshop 15 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
import type { Embeddings } from "@langchain/core/embeddings";
import type pg from "pg";
import { lessonDocuments } from "../../../src/rag/lessons.js";
import { createPgVectorStore, upsertDocuments } from "../../../src/rag/pg-store.js";

export const LESSON_TABLE = "lessons";

interface Common {
  embeddings: Embeddings;
  queryEmbeddings?: Embeddings;
  pool: pg.Pool;
  tableName?: string;
}

/** index บทเรียนทั้งหมดลง pgvector (idempotent — รันซ้ำต้องไม่ซ้ำแถวและไม่ embed ซ้ำ) */
export async function indexLessons(opts: Common): Promise<{ total: number; embedded: number }> {
  void [lessonDocuments, createPgVectorStore, upsertDocuments, opts];
  throw new Error("TODO: ยังไม่ได้ทำ");
}

export interface LessonHit { id: string; title: string; subject: string; grade: number; score: number }

/** ค้นบทเรียนตามความหมาย กรองตามวิชาได้ — topK <= 0 ต้อง error, query ว่าง → [] */
export async function searchLessons(query: string, opts: Common & { subject?: string; topK?: number }): Promise<LessonHit[]> {
  void [query, opts];
  throw new Error("TODO: ยังไม่ได้ทำ");
}
