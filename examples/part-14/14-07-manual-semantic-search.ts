// 14-07: Manual Semantic Search
// แนวคิด: embed เอกสารทั้งชุด + embed query → คำนวณ cosine ทุกตัว → เรียงคะแนน (ทำเองด้วย semanticSearch ก่อนใช้ฐานข้อมูล vector ใน Part 15)
import { createEmbeddings } from "../../src/embeddings/index.js";
import { semanticProducts } from "../../src/data/semantic-products.js";
import { retryAsync } from "../../src/utils/retry.js";
import { semanticSearch } from "../../src/rag/semantic-search.js";

const documents = semanticProducts.map((p) => ({ id: p.name, text: p.text }));
const hits = await retryAsync(() => semanticSearch({ query: "อุปกรณ์สำหรับเขียนโปรแกรม", documents, embeddings: createEmbeddings("RETRIEVAL_DOCUMENT"), queryEmbeddings: createEmbeddings("RETRIEVAL_QUERY"), topK: documents.length }));
console.log('คำค้น: "อุปกรณ์สำหรับเขียนโปรแกรม" — จัดอันดับทั้ง', documents.length, "รายการ\n");
hits.forEach((h, i) => console.log(String(i + 1).padStart(2), h.score.toFixed(3), h.id));
