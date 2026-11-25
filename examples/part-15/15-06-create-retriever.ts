// 15-06: Create Retriever
// แนวคิด: Retriever = อินเทอร์เฟซมาตรฐาน "ใส่คำถาม → ได้ Document[]" (Runnable) — ครอบ vector store ด้วย asRetriever() เพื่อต่อเข้า chain/agent ได้ (Part 16)
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createEmbeddings } from "../../src/embeddings/index.js";
import { loadLessonDocs } from "./_lessons.js";

const store = await MemoryVectorStore.fromDocuments(await loadLessonDocs(6), createEmbeddings());
const retriever = store.asRetriever({ k: 2 });
console.log("ชนิด:", retriever.constructor.name);
console.log("เป็น Runnable (มี invoke/batch/stream):", typeof retriever.invoke, typeof retriever.batch, typeof retriever.stream);
console.log("lc_namespace:", retriever.lc_namespace.join("."));
