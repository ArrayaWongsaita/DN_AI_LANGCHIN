// 14-09: Compare Keyword and Semantic Search
// แนวคิด: keyword หาคำที่ "ตรงตัว"; semantic หาตาม "ความหมาย" — แต่ละแบบพลาดคนละแบบ
import { createEmbeddings } from "../../src/embeddings/index.js";
import { semanticProducts } from "../../src/data/semantic-products.js";
import { retryAsync } from "../../src/utils/retry.js";
import { semanticSearch } from "../../src/rag/semantic-search.js";

const documents = semanticProducts.map((p) => ({ id: p.name, text: p.text }));
// เอกสารและคำค้นใช้ task คนละแบบ; retryAsync (รอ 15 วิ แล้วเพิ่มเป็นเท่าตัว) รับมือโควตา free tier เต็ม
const embeddings = createEmbeddings("RETRIEVAL_DOCUMENT");
const queryEmbeddings = createEmbeddings("RETRIEVAL_QUERY");
const search = (o: { query: string; topK?: number; minScore?: number }) => retryAsync(() => semanticSearch({ ...o, documents, embeddings, queryEmbeddings }), { delayMs: 15000 });

/** keyword search แบบง่าย: ตัดคำด้วยช่องว่าง แล้วนับว่าเอกสารมีคำค้นกี่คำ (ไทยไม่มีช่องว่าง จึงต้องค้นเป็นวลีสั้นๆ) */
function keywordSearch(query: string, topK = 3) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return documents
    .map((d) => ({ id: d.id, score: terms.filter((t) => d.text.toLowerCase().includes(t)).length }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

for (const q of ["อุปกรณ์สำหรับเขียนโปรแกรม", "keyboard", "computer for coding"]) {
  console.log(`\nคำค้น: "${q}"`);
  const kw = keywordSearch(q);
  console.log("  keyword :", kw.length ? kw.map((h) => h.id).join(", ") : "(ไม่พบ)");
  const sem = await search({ query: q, topK: 3 });
  console.log("  semantic:", sem.map((h) => `${h.id} (${h.score.toFixed(2)})`).join(", "));
}
