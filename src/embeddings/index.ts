import type { Embeddings } from "@langchain/core/embeddings";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { requireEnv } from "../utils/env.js";

/** ขนาด vector ที่ใช้ทั้งคอร์ส — ต้องตรงกับคอลัมน์ vector(768) ใน pgvector */
export const EMBEDDING_DIMENSIONS = 768;

/** Gemini task type: บอกโมเดลว่า vector นี้ใช้ทำอะไร (ผลค้นหาแม่นขึ้นเล็กน้อยเมื่อแยกเอกสาร/คำค้น) */
export type EmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/** Google Gemini embeddings (free tier) — ต้องมี GOOGLE_API_KEY; ส่ง task ได้ (ไม่ส่ง = ไม่ระบุประเภทงาน) */
export function createEmbeddings(task?: EmbeddingTask): Embeddings {
  return new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: requireEnv("GOOGLE_API_KEY"),
    outputDimensionality: EMBEDDING_DIMENSIONS,
    // taskType เป็น enum ของ SDK ใต้ชั้น (ค่าสตริงเดียวกับ EmbeddingTask) — cast เพื่อไม่ต้องพึ่งแพ็กเกจที่ไม่ใช่ direct dependency
    ...(task ? { taskType: task as never } : {}),
  });
}
