import type { Embeddings } from "@langchain/core/embeddings";
import { cosineSimilarity } from "../utils/similarity.js";

export interface SearchableDocument {
  id: string;
  text: string;
}

export interface SemanticSearchOptions {
  query: string;
  documents: SearchableDocument[];
  /** ใช้ embed เอกสาร (และ query ถ้าไม่ระบุ queryEmbeddings) */
  embeddings: Embeddings;
  /** (ไม่บังคับ) ตัว embed สำหรับ query — เช่น Gemini taskType RETRIEVAL_QUERY คู่กับ RETRIEVAL_DOCUMENT ของเอกสาร */
  queryEmbeddings?: Embeddings;
  topK?: number;
  /** กรองผลที่ cosine similarity ต่ำกว่าค่านี้ทิ้ง */
  minScore?: number;
}

export interface SearchHit extends SearchableDocument {
  score: number;
}

/**
 * ค้นหาตามความหมายแบบ manual: embed เอกสารทีเดียวแบบ batch + embed query หนึ่งครั้ง
 * แล้วเรียงตาม cosine similarity (ใน Part 15 งานนี้ย้ายไปทำที่ฐานข้อมูล vector)
 */
export async function semanticSearch(opts: SemanticSearchOptions): Promise<SearchHit[]> {
  const { query, documents, embeddings, queryEmbeddings = embeddings, topK = 3, minScore } = opts;
  if (topK <= 0) throw new Error(`topK ต้องมากกว่า 0 (ได้ ${topK})`);
  if (!query.trim() || documents.length === 0) return [];

  const [docVectors, queryVector] = await Promise.all([
    embeddings.embedDocuments(documents.map((d) => d.text)),
    queryEmbeddings.embedQuery(query),
  ]);
  // provider อาจตอบ vector ว่างเมื่อโควตาเต็ม (พบจริงกับ Gemini free tier: ไม่โยน error แต่คืน [] ทุกรายการ) — แจ้งให้ชัดแทน error คณิตศาสตร์งงๆ
  if (queryVector.length === 0) throw new Error("embedding ของ query ว่างเปล่า (provider ตอบผิดปกติ — มักเกิดจากโควตา free tier เต็ม รอ ~1 นาทีแล้วลองใหม่)");
  if (docVectors.length !== documents.length || docVectors.some((v) => v.length === 0)) {
    throw new Error(`embedding ของเอกสารไม่ครบ: ได้ ${docVectors.length}/${documents.length} vector (มักเกิดจากโควตา free tier เต็ม รอ ~1 นาทีแล้วลองใหม่)`);
  }
  return documents
    .map((d, i) => ({ ...d, score: cosineSimilarity(queryVector, docVectors[i]) }))
    .filter((h) => minScore === undefined || h.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
