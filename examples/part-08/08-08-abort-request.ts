// 08-08: Abort Request
// แนวคิด: ยกเลิกคำขอระหว่างทางด้วย AbortController + signal (เช่น ผู้ใช้กด Stop / หมดเวลา) — เก็บ "partial response" ที่ได้ไว้ได้
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 3000 });

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 700); // หมดเวลา 700 ms แล้วยกเลิก

let partial = "";
try {
  const stream = await model.stream("เขียนเรียงความยาวเรื่องประโยชน์ของการอ่านหนังสือ อย่างน้อย 15 ประโยค", {
    signal: controller.signal,
  });
  for await (const chunk of stream) partial += messageText(chunk);
  console.log("จบปกติ (เร็วกว่า 700 ms)");
} catch (err) {
  const e = err as Error;
  console.log(`ถูกยกเลิก: ${e.name} — ${e.message}`);
} finally {
  clearTimeout(timer);
}
console.log(`ข้อความบางส่วนที่ได้ก่อนยกเลิก (${partial.length} ตัวอักษร):\n${partial.slice(0, 200)}${partial.length > 200 ? "…" : ""}`);
