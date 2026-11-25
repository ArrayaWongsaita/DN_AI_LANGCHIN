// 15-07: Retrieve Documents
// แนวคิด: retriever.invoke(query) → Document[]; ตั้ง k และ filter ตอนสร้าง retriever; batch() ถามหลายคำถามพร้อมกัน
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createEmbeddings } from "../../src/embeddings/index.js";
import { loadLessonDocs } from "./_lessons.js";

const store = await MemoryVectorStore.fromDocuments(await loadLessonDocs(11), createEmbeddings());
const retriever = store.asRetriever({ k: 2 });
const ids = (ds: { metadata: Record<string, unknown> }[]) => ds.map((d) => d.metadata.id).join(", ");

console.log("invoke:", ids(await retriever.invoke("แรงเสียดทานคืออะไร")));
const [a, b] = await retriever.batch(["เซลล์ในร่างกาย", "ใช้พลังงานแสงอาทิตย์"]);
console.log("batch :", ids(a), "|", ids(b));

const mathOnly = store.asRetriever({ k: 2, filter: (d) => d.metadata.subject === "math" });
console.log("filter math:", ids(await mathOnly.invoke("การคำนวณ")));
