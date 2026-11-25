// Workshop 14 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
import type { Embeddings } from "@langchain/core/embeddings";
import { semanticProducts } from "../../../src/data/semantic-products.js";
import { createEmbeddings } from "../../../src/embeddings/index.js";
import { semanticSearch, type SearchHit } from "../../../src/rag/semantic-search.js";

/** ค้นสินค้าตามความหมาย — คืนชื่อสินค้า + คะแนน (เอกสาร = คำอธิบายสินค้า) */
export async function searchProducts(
  query: string,
  opts: { topK?: number; minScore?: number; embeddings?: Embeddings; queryEmbeddings?: Embeddings } = {},
): Promise<SearchHit[]> {
  // TODO: embeddings ของเอกสารใช้ taskType RETRIEVAL_DOCUMENT, ของ query ใช้ RETRIEVAL_QUERY (ดู createEmbeddings)
  //       เรียก semanticSearch แล้วกรองด้วย minScore; query ว่าง → []
  void [semanticProducts, createEmbeddings, semanticSearch, query, opts];
  throw new Error("TODO: ยังไม่ได้ทำ");
}
