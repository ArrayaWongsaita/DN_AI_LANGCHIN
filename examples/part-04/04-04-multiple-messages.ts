// 04-04: Multiple Messages
// แนวคิด: ส่งหลาย message ในลำดับที่ตั้งใจ (system → human → ai → human) — ลำดับมีผลต่อคำตอบ
// ตัวอย่างนี้ใช้ "ตัวอย่างบทสนทนา" (few-shot) สอนรูปแบบคำตอบด้วย message ล้วนๆ
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 1500 });

const messages = [
  new SystemMessage("แปลงชื่อสัตว์เป็นอีโมจิ ตอบเป็นอีโมจิเดียวเท่านั้น"),
  new HumanMessage("แมว"),
  new AIMessage("🐱"),
  new HumanMessage("ช้าง"),
  new AIMessage("🐘"),
  new HumanMessage("ปลาวาฬ"), // ข้อความล่าสุดที่เราอยากได้คำตอบ
];

const r = await model.invoke(messages);
console.log("ส่งไป", messages.length, "messages →", messageText(r).trim());
