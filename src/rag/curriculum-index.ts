import type { Document } from "@langchain/core/documents";
import type { Embeddings } from "@langchain/core/embeddings";
import type { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import type pg from "pg";
import { countingEmbeddings } from "../embeddings/counting.js";
import { chunkDocuments, loadCurriculum } from "./load-curriculum.js";
import { createPgVectorStore, upsertDocuments } from "./pg-store.js";

export const CURRICULUM_TABLE = "curriculum";
/** ชิ้นที่สั้นกว่านี้ (เช่น ค่า string เดี่ยวๆ จาก JSON) ไม่มีความหมายพอจะค้น — ไม่ index */
export const MIN_CHUNK_LENGTH = 20;

export interface IndexCurriculumOptions {
  embeddings: Embeddings;
  pool: pg.Pool;
  tableName?: string;
  dir?: string;
  /** ชนิดไฟล์ที่ index (ค่าเริ่มต้นไม่รวม json: ค่า string เดี่ยวๆ ในตารางเรียนไม่มีความหมายเมื่อแยกเดี่ยว และกลายเป็น noise ในผลค้น) */
  types?: string[];
}

/** โหลด → แบ่ง chunk → upsert ลง pgvector (idempotent: รันซ้ำไม่ embed ซ้ำ) */
export async function indexCurriculum(opts: IndexCurriculumOptions): Promise<{ chunks: number; embedded: number; warnings: string[] }> {
  const counter = countingEmbeddings(opts.embeddings);
  const store = await createPgVectorStore({ embeddings: counter, tableName: opts.tableName ?? CURRICULUM_TABLE, pool: opts.pool });
  const { documents, warnings } = await loadCurriculum(opts.dir);
  const types = new Set(opts.types ?? ["txt", "md", "csv", "pdf"]);
  const chunks = (await chunkDocuments(documents.filter((d) => types.has(d.metadata.type)), { chunkSize: 500, chunkOverlap: 50 })).filter((c) => c.pageContent.trim().length >= MIN_CHUNK_LENGTH);
  await upsertDocuments(store, chunks);
  return { chunks: chunks.length, embedded: counter.documentsEmbedded, warnings };
}

export interface CurriculumRetrieverOptions {
  /** Embeddings สำหรับคำค้น (เช่น taskType RETRIEVAL_QUERY) */
  queryEmbeddings: Embeddings;
  k?: number;
  /** ระยะห่าง cosine สูงสุดที่ยอมรับ (น้อย = ใกล้) — ผลที่ไกลกว่านี้ถูกตัดทิ้ง ค่าเริ่มต้น 0.35 calibrate จากชุด data/curriculum (ผลดีที่สุดของคำถามตรงเรื่อง ≤ 0.28, ของคำถามนอกเรื่อง ≥ 0.43) ต้อง calibrate ใหม่กับข้อมูลจริงของคุณ */
  maxDistance?: number;
  filter?: Record<string, string | number | boolean>;
}

/** retriever ที่ตัดผลซึ่งไม่ใกล้พอ — ถ้าไม่มีอะไรใกล้เลยจะคืน [] (ให้ RAG ตอบ "ไม่พบ" ได้) */
export function createCurriculumRetriever(store: PGVectorStore, opts: CurriculumRetrieverOptions): { invoke(query: string): Promise<Document[]> } {
  const { queryEmbeddings, k = 4, maxDistance = 0.35, filter } = opts;
  return {
    async invoke(query: string): Promise<Document[]> {
      if (!query.trim()) return [];
      const qv = await queryEmbeddings.embedQuery(query);
      if (qv.length === 0) throw new Error("embedding ของ query ว่างเปล่า (provider ตอบผิดปกติ — มักเกิดจากโควตา free tier เต็ม รอ ~1 นาทีแล้วลองใหม่)");
      const rows = await store.similaritySearchVectorWithScore(qv, k, filter);
      return rows.filter(([, distance]) => distance <= maxDistance).map(([d]) => d);
    },
  };
}
