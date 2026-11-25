// 16-01: Manual Context Injection
// ปัญหา: LLM ไม่รู้ข้อมูลเฉพาะของเรา (กฎโรงเรียน) → เดา/แต่งขึ้น (hallucination)
// ทางออกที่ง่ายที่สุด: "แปะ" เนื้อหาที่เกี่ยวข้องลงใน prompt เอง — RAG คือการทำขั้นตอนนี้ให้อัตโนมัติ
import { readFileSync } from "node:fs";
import { createChatModel } from "../../src/models/index.js";
import { retryAsync } from "../../src/utils/retry.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 1500 });
const question = "วิชาคณิตศาสตร์ ม.1 ของโรงเรียนตัวอย่างวิทยา ต้องมีเวลาเรียนกี่เปอร์เซ็นต์จึงจะมีสิทธิ์สอบปลายภาค และสอบกลางภาคกี่คะแนน";

const without = await retryAsync(() => model.invoke([{ role: "user", content: `${question} (ตอบสั้นๆ)` }]));
console.log("--- ไม่มีบริบท ---\n" + messageText(without).trim());

const doc = readFileSync("data/curriculum/math-m1.md", "utf8");
const withCtx = await retryAsync(() =>
  model.invoke([
    { role: "system", content: "ตอบจากเอกสารที่ให้เท่านั้น ถ้าไม่มีข้อมูลให้บอกว่าไม่มี ตอบสั้นๆ" },
    { role: "user", content: `เอกสาร:\n${doc}\n\nคำถาม: ${question}` },
  ]),
);
console.log("\n--- แปะเอกสารทั้งไฟล์ลง prompt ---\n" + messageText(withCtx).trim());
console.log("\nข้อจำกัด: แปะทั้งไฟล์ได้เมื่อเอกสารน้อย — เอกสารเป็นร้อยไฟล์ต้อง 'ค้น' เฉพาะส่วนที่เกี่ยวข้องก่อน");
