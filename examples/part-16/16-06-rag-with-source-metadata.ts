// 16-06: RAG with Source Metadata
// แนวคิด: ให้โมเดลอ้าง [n] แล้วโค้ดแปลงเป็นชื่อไฟล์ — ผู้ใช้ตรวจสอบต้นทางได้ (ตัดซ้ำตามไฟล์ และทิ้งเลขที่โมเดลมั่ว)
import { createChatModel } from "../../src/models/index.js";
import { answerWithRag } from "../../src/rag/rag.js";
import { retryAsync } from "../../src/utils/retry.js";
import { withKnowledgeBase } from "./_kb.js";

const model = await createChatModel({ maxTokens: 1500 });
await withKnowledgeBase(async ({ retriever }) => {
  for (const q of ["ค่าเข้าค่ายลูกเสือเท่าไร ครอบคลุมอะไรบ้าง", "ชั้นเรียนเสริมคณิตศาสตร์เปิดวันไหน ที่ไหน"]) {
    const r = await retryAsync(() => answerWithRag({ question: q, retriever, model }));
    console.log(`\nคำถาม: ${q}\nคำตอบ: ${r.answer}\nแหล่งที่มา: ${r.sources.map((s) => `[${s.n}] ${s.source}`).join(", ") || "(ไม่มีการอ้างอิง)"} | usedContext: ${r.usedContext}`);
  }
});
