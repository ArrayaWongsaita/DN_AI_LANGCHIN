// 15-03: Similarity Search
// แนวคิด: similaritySearch(query, k) → Document k ชิ้นที่ใกล้ที่สุด (เรียงจากใกล้สุด)
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createEmbeddings } from "../../src/embeddings/index.js";
import { loadLessonDocs } from "./_lessons.js";

const store = await MemoryVectorStore.fromDocuments(await loadLessonDocs(6), createEmbeddings());
for (const q of ["วิธีหาค่า x ในสมการ", "ราคาสินค้าลดราคา 20%"]) {
  const r = await store.similaritySearch(q, 2);
  console.log(`\nคำค้น: ${q}`);
  r.forEach((d, i) => console.log(`  ${i + 1}. ${d.metadata.id} — ${d.pageContent.split("\n")[0]}`));
}
