import { parseArgs } from "node:util";
import type { Embeddings } from "@langchain/core/embeddings";
import { semanticProducts } from "../../../src/data/semantic-products.js";
import { createEmbeddings } from "../../../src/embeddings/index.js";
import { semanticSearch, type SearchHit } from "../../../src/rag/semantic-search.js";
import { isMain } from "../../../src/utils/is-main.js";
import { retryAsync } from "../../../src/utils/retry.js";

/** ค้นสินค้าตามความหมาย — คืนชื่อสินค้า + คะแนน (เอกสาร = คำอธิบายสินค้า) */
export async function searchProducts(
  query: string,
  opts: { topK?: number; minScore?: number; embeddings?: Embeddings; queryEmbeddings?: Embeddings } = {},
): Promise<SearchHit[]> {
  const embeddings = opts.embeddings ?? createEmbeddings("RETRIEVAL_DOCUMENT");
  const queryEmbeddings = opts.queryEmbeddings ?? (opts.embeddings ? undefined : createEmbeddings("RETRIEVAL_QUERY"));
  const documents = semanticProducts.map((p) => ({ id: p.name, text: p.text }));
  return semanticSearch({ query, documents, embeddings, queryEmbeddings, topK: opts.topK, minScore: opts.minScore });
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { "top-k": { type: "string" }, "min-score": { type: "string" } },
  });
  const query = positionals.join(" ").trim();
  if (!query) {
    console.error('ใช้: semantic-product-search.ts "คำค้น" [--top-k 3] [--min-score 0.6]');
    process.exit(1);
  }
  try {
    const hits = await retryAsync(
      () => searchProducts(query, { topK: values["top-k"] ? Number(values["top-k"]) : 3, minScore: values["min-score"] ? Number(values["min-score"]) : undefined }),
      { delayMs: 15000 },
    );
    console.log(`คำค้น: "${query}"`);
    if (hits.length === 0) console.log("(ไม่พบสินค้าที่เกี่ยวข้อง)");
    hits.forEach((h, i) => console.log(`${i + 1}. ${h.id}  (cosine ${h.score.toFixed(3)})`));
  } catch (e) {
    console.error("❌", (e as Error).message);
    process.exitCode = 1;
  }
}
