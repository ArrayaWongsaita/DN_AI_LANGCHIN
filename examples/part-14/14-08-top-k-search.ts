// 14-08: Top-K Search
// แนวคิด: topK = เอาแค่ K อันดับแรก; minScore = ตัดผลที่ไม่เกี่ยวทิ้ง (ไม่งั้น topK จะคืนของไม่เกี่ยวมาให้เสมอเมื่อไม่มีของที่ใช่)
// ข้อควรระวัง: คะแนน cosine ของ Gemini อัดกันแคบ (~0.5–0.7) ค่า 0.6 ในตัวอย่างนี้ "ได้จากการดูข้อมูลชุดนี้" — ต้อง calibrate ใหม่กับข้อมูลและโมเดลของคุณเอง
import { createEmbeddings } from "../../src/embeddings/index.js";
import { semanticProducts } from "../../src/data/semantic-products.js";
import { retryAsync } from "../../src/utils/retry.js";
import { semanticSearch } from "../../src/rag/semantic-search.js";

const documents = semanticProducts.map((p) => ({ id: p.name, text: p.text }));
// เอกสารและคำค้นใช้ task คนละแบบ; retryAsync (รอ 15 วิ แล้วเพิ่มเป็นเท่าตัว) รับมือโควตา free tier เต็ม
const embeddings = createEmbeddings("RETRIEVAL_DOCUMENT");
const queryEmbeddings = createEmbeddings("RETRIEVAL_QUERY");
const search = (o: { query: string; topK?: number; minScore?: number }) => retryAsync(() => semanticSearch({ ...o, documents, embeddings, queryEmbeddings }), { delayMs: 15000 });
const show = (label: string, hits: { id: string; score: number }[]) =>
  console.log(label.padEnd(30), hits.length ? hits.map((h) => `${h.id} (${h.score.toFixed(2)})`).join(", ") : "(ไม่มีผล)");

const q = "ของใช้สำหรับทำงานที่โต๊ะคอมพิวเตอร์";
show("topK=3", await search({ query: q, topK: 3 }));
show("topK=5", await search({ query: q, topK: 5 }));
show("topK=5 minScore=0.6", await search({ query: q, topK: 5, minScore: 0.6 }));

const off = "รถยนต์ไฟฟ้ามือสอง";
show("\nนอกขอบเขต topK=3", await search({ query: off, topK: 3 }));
show("นอกขอบเขต + minScore=0.6", await search({ query: off, topK: 3, minScore: 0.6 }));
