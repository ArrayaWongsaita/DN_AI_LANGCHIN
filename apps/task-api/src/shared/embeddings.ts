import type { Embeddings } from "@langchain/core/embeddings";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { requireEnv } from "./env.js";

/** ขนาด vector — ต้องตรงกับคอลัมน์ vector(768) ใน pgvector */
export const EMBEDDING_DIMENSIONS = 768;

/** Google Gemini embeddings (free tier) — ต้องมี GOOGLE_API_KEY */
export function createEmbeddings(task?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Embeddings {
  return new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: requireEnv("GOOGLE_API_KEY"),
    outputDimensionality: EMBEDDING_DIMENSIONS,
    ...(task ? { taskType: task as never } : {}),
  });
}
