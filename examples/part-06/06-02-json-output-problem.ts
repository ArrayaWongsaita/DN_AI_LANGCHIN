// 06-02: JSON Output Problem
// แนวคิด: "ขอให้ตอบเป็น JSON" แล้ว JSON.parse() ยังไม่น่าไว้ใจ — ผลที่ผิดรูปแบบเจอบ่อย
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

// (ก) ตัวอย่างผลลัพธ์ที่ "เจอได้จริง" เมื่อใช้ JSON.parse กับคำตอบของ model — deterministic ไม่เรียก API
const samples: Record<string, string> = {
  "JSON สะอาด": '{"name":"เสื้อ","price":350}',
  "ห่อด้วย markdown": '```json\n{"name":"เสื้อ","price":350}\n```',
  "มีคำนำหน้า": 'ได้เลยครับ นี่คือ JSON: {"name":"เสื้อ","price":350}',
  "ใช้ single quote": "{'name':'เสื้อ','price':350}",
  "ตัดกลางคัน": '{"name":"เสื้อ","price":35',
};
for (const [label, raw] of Object.entries(samples)) {
  try {
    JSON.parse(raw);
    console.log(`✅ ${label}`);
  } catch (e) {
    console.log(`❌ ${label} → ${(e as Error).message.slice(0, 50)}`);
  }
}

// (ข) ของจริง: ขอ JSON แล้ว parse เอง
const model = await createChatModel({ maxTokens: 1500 });
const raw = messageText(
  await model.invoke('ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น: {"name": string, "price": number} จาก "เสื้อสีดำราคา 350 บาท"'),
);
console.log("\nคำตอบดิบ:", JSON.stringify(raw));
try {
  const obj = JSON.parse(raw) as { price: unknown };
  console.log("parse สำเร็จ แต่ type ของ price คือ:", typeof obj.price, "(ไม่มีอะไรรับประกันว่าเป็น number)");
} catch {
  console.log("parse ไม่สำเร็จ — ต้องเขียนโค้ดกู้คืนเอง");
}
