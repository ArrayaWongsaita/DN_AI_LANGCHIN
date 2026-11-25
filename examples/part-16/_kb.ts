// ตัวช่วยของตัวอย่าง Part 16 (ไม่ใช่ตัวอย่าง — ขึ้นต้นด้วย _ จึงไม่อยู่ใน `pnpm play`)
// เตรียม "ฐานความรู้": index data/curriculum ลง pgvector (ครั้งแรกเท่านั้นที่ embed) แล้วคืน retriever
import type { Document } from "@langchain/core/documents";
import { createEmbeddings } from "../../src/embeddings/index.js";
import { CURRICULUM_TABLE, createCurriculumRetriever, indexCurriculum } from "../../src/rag/curriculum-index.js";
import { createPgVectorStore } from "../../src/rag/pg-store.js";
import { withDb } from "../../src/utils/db.js";
import { retryAsync } from "../../src/utils/retry.js";

export interface KnowledgeBase {
  retriever: { invoke(query: string): Promise<Document[]> };
}

/** เปิดฐานความรู้ → รัน fn → ปิด connection (ต้อง `docker compose up -d`) */
export async function withKnowledgeBase<T>(fn: (kb: KnowledgeBase) => Promise<T>, opts: { k?: number } = {}): Promise<T> {
  return withDb(async (pool) => {
    const docEmbeddings = createEmbeddings("RETRIEVAL_DOCUMENT");
    await retryAsync(() => indexCurriculum({ embeddings: docEmbeddings, pool }), { delayMs: 15000 }); // idempotent
    const store = await createPgVectorStore({ embeddings: docEmbeddings, tableName: CURRICULUM_TABLE, pool });
    const inner = createCurriculumRetriever(store, { queryEmbeddings: createEmbeddings("RETRIEVAL_QUERY"), k: opts.k ?? 4 });
    return fn({ retriever: { invoke: (q: string) => retryAsync(() => inner.invoke(q), { delayMs: 15000 }) } });
  });
}

export const snippet = (d: Document, n = 70): string => `${d.metadata.source}: ${d.pageContent.replace(/\s+/g, " ").slice(0, n)}…`;
