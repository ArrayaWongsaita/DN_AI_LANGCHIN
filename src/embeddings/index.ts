import type { Embeddings } from "@langchain/core/embeddings";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { requireEnv } from "../utils/env.js";

/** ขนาด vector ที่ใช้ทั้งคอร์ส — ต้องตรงกับคอลัมน์ vector(768) ใน pgvector */
export const EMBEDDING_DIMENSIONS = 768;

/** Google Gemini embeddings (free tier) — ต้องมี GOOGLE_API_KEY */
export function createEmbeddings(): Embeddings {
  return new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: requireEnv("GOOGLE_API_KEY"),
    outputDimensionality: EMBEDDING_DIMENSIONS,
  });
}
