// 15-01: MemoryVectorStore
// แนวคิด: vector store = ที่เก็บ (ข้อความ + vector + metadata) พร้อมค้นหาตามความคล้าย; MemoryVectorStore เก็บใน RAM (หายเมื่อปิดโปรแกรม) เหมาะกับทดลอง/เทสต์
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createEmbeddings } from "../../src/embeddings/index.js";

const store = await MemoryVectorStore.fromTexts(
  ["สมการเชิงเส้นตัวแปรเดียว", "เซลล์พืชและเซลล์สัตว์", "ชนิดของคำในภาษาไทย", "ภูมิศาสตร์ประเทศไทย"],
  [{ subject: "math" }, { subject: "science" }, { subject: "thai" }, { subject: "social" }],
  createEmbeddings(),
);
console.log("จำนวนรายการที่เก็บ:", store.memoryVectors.length);
console.log("รายการแรก:", { content: store.memoryVectors[0].content, metadata: store.memoryVectors[0].metadata, มิติ: store.memoryVectors[0].embedding.length });
