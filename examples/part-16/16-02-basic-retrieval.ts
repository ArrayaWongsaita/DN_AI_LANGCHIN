// 16-02: Basic Retrieval
// แนวคิด: ขั้นแรกของ RAG = "ค้น" ก่อน (ยังไม่ใช้ LLM) — ตรวจว่า retriever เจอส่วนที่ถูกต้องไหม ถ้าค้นผิด LLM ก็ตอบผิด
import { snippet, withKnowledgeBase } from "./_kb.js";

await withKnowledgeBase(async ({ retriever }) => {
  for (const q of ["ต้องมีเวลาเรียนกี่เปอร์เซ็นต์ถึงสอบปลายภาคได้", "ค่าเข้าค่ายลูกเสือเท่าไร", "ราคาน้ำมันวันนี้เท่าไร"]) {
    const docs = await retriever.invoke(q);
    console.log(`\nคำถาม: ${q}\n→ ดึงได้ ${docs.length} ชิ้น`);
    docs.slice(0, 2).forEach((d, i) => console.log(`  ${i + 1}. ${snippet(d)}`));
  }
});
