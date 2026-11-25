// 15-04: Similarity Search with Score
// แนวคิด: similaritySearchWithScore → [Document, score] — MemoryVectorStore ให้ cosine similarity (มาก = ใกล้); คะแนนมีไว้ตัดผลที่ไม่เกี่ยว
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createEmbeddings } from "../../src/embeddings/index.js";
import { loadLessonDocs } from "./_lessons.js";

const store = await MemoryVectorStore.fromDocuments(await loadLessonDocs(6), createEmbeddings());
for (const q of ["วิธีหาค่า x ในสมการ", "วิธีทำต้มยำกุ้ง"]) {
  console.log(`\nคำค้น: ${q}`);
  for (const [d, score] of await store.similaritySearchWithScore(q, 3)) console.log(`  ${score.toFixed(3)}  ${d.metadata.id} — ${d.metadata.title}`);
}
console.log("\nสังเกต: คำค้นที่ไม่เกี่ยวข้องเลย (ต้มยำกุ้ง) ก็ยังได้ผลลัพธ์ — ต้องใช้เกณฑ์คะแนนหรือ metadata ช่วยตัด");
