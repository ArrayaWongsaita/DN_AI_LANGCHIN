// 08-01: invoke() vs stream()
// แนวคิด: invoke() รอจนได้คำตอบครบ (blocking) · stream() ได้ทีละชิ้นทันที — ผู้ใช้เห็นข้อความเร็วขึ้น
// วัด TTFT (Time To First Token) = เวลาตั้งแต่ส่งคำขอถึงชิ้นแรกที่ได้
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 2000 });
const prompt = "เล่าเรื่องสั้นเกี่ยวกับแมวนักบินอวกาศ 4 ประโยค";

let t = performance.now();
const full = await model.invoke(prompt);
const invokeMs = Math.round(performance.now() - t);
console.log(`invoke(): ได้ผลทีเดียวหลัง ${invokeMs} ms (${messageText(full).length} ตัวอักษร)`);

t = performance.now();
let ttft = 0;
let chars = 0;
for await (const chunk of await model.stream(prompt)) {
  const text = messageText(chunk);
  if (!ttft && text) ttft = Math.round(performance.now() - t); // ชิ้นแรกที่มีข้อความ
  chars += text.length;
}
const streamMs = Math.round(performance.now() - t);
console.log(`stream(): ชิ้นแรกมาใน ${ttft} ms (TTFT) | จบหลัง ${streamMs} ms (${chars} ตัวอักษร)`);
console.log("→ เวลารวมใกล้เคียงกัน แต่ stream ให้ผู้ใช้เห็นผลเร็วกว่ามาก");
