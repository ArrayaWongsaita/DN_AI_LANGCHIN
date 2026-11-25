// 14-05: embedDocuments()
// แนวคิด: embedDocuments(texts[]) → number[][] ส่งทีเดียวทั้ง batch (เร็วกว่าและประหยัดโควตากว่าเรียกทีละข้อความ)
// ทำไมแยกจาก embedQuery: บางโมเดลแยก "ประเภทงาน" (query vs document) เพื่อให้ผลค้นหาแม่นขึ้น — ใช้ให้ตรงบทบาทเสมอ
import { createEmbeddings } from "../../src/embeddings/index.js";
import { semanticProducts } from "../../src/data/semantic-products.js";

const texts = semanticProducts.slice(0, 5).map((p) => p.text);
const vectors = await createEmbeddings("RETRIEVAL_DOCUMENT").embedDocuments(texts);
console.log("ส่ง", texts.length, "ข้อความใน 1 คำขอ → ได้", vectors.length, "vector");
console.log("ความยาวแต่ละ vector:", vectors.map((v) => v.length));
