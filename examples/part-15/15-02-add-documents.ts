// 15-02: Add Documents
// แนวคิด: สร้าง store ว่างก่อน แล้ว addDocuments() ทีหลังได้ (embed แบบ batch ให้เอง); fromDocuments() = สร้าง+เติมในขั้นเดียว
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createEmbeddings } from "../../src/embeddings/index.js";
import { loadLessonDocs } from "./_lessons.js";

const docs = await loadLessonDocs(6);

const store = new MemoryVectorStore(createEmbeddings());
console.log("ก่อนเพิ่ม:", store.memoryVectors.length);
await store.addDocuments(docs);
console.log("หลังเพิ่ม :", store.memoryVectors.length, "(embed ทั้ง 6 ชิ้นใน 1 batch)");
