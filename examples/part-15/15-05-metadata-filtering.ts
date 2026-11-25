// 15-05: Metadata Filtering
// แนวคิด: กรองตาม metadata (วิชา/ชั้น/แหล่งที่มา) ควบคู่กับความคล้าย — MemoryVectorStore รับ filter เป็นฟังก์ชัน; pgvector (15-08+) รับเป็น object
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createEmbeddings } from "../../src/embeddings/index.js";
import { loadLessonDocs } from "./_lessons.js";

const docs = (await loadLessonDocs()).filter((d) => ["m1-03", "m1-06", "s1-01", "s1-03", "t1-02"].includes(d.metadata.id));
const store = await MemoryVectorStore.fromDocuments(docs, createEmbeddings());
const q = "การคำนวณและการแก้ปัญหา";
const show = (label: string, r: { metadata: Record<string, unknown> }[]) => console.log(label.padEnd(18), r.map((d) => `${d.metadata.id}(${d.metadata.subject})`).join(", "));
show("ไม่กรอง k=3", await store.similaritySearch(q, 3));
show("subject=math", await store.similaritySearch(q, 3, (d) => d.metadata.subject === "math"));
show("subject=science", await store.similaritySearch(q, 3, (d) => d.metadata.subject === "science"));
show("subject=history", await store.similaritySearch(q, 3, (d) => d.metadata.subject === "history"));
