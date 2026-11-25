// 14-03: Initialize Embedding Model (live — Gemini)
// แนวคิด: createEmbeddings() ห่อ GoogleGenerativeAIEmbeddings (gemini-embedding-001, ปรับให้ได้ 768 มิติ)
import { EMBEDDING_DIMENSIONS, createEmbeddings } from "../../src/embeddings/index.js";

const embeddings = createEmbeddings();
console.log("คลาส:", embeddings.constructor.name);
console.log("มิติที่ตั้งไว้:", EMBEDDING_DIMENSIONS);
const v = await embeddings.embedQuery("ทดสอบ");
console.log("ลองเรียก 1 ครั้ง → ความยาว vector:", v.length);
