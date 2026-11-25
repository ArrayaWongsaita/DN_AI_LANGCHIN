// 01-01: Basic LLM Input and Output
// แนวคิด: LLM คือฟังก์ชันที่รับ "ข้อความ" (input) แล้วคืน "ข้อความ" (output)
// ยังไม่ต้องเข้าใจโค้ดส่วนตั้งค่า — Part 02-03 จะอธิบายละเอียด
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ temperature: 0 });

// Input: ข้อความหนึ่งก้อน
const input = "อธิบาย LLM ใน 1 ประโยค";
console.log("INPUT :", input);

// Process: ส่งให้ model ประมวลผล (inference) ทีละ token
const response = await model.invoke(input);

// Output: AIMessage — ข้อความตอบกลับ + metadata
console.log("OUTPUT:", messageText(response));

// จำนวน token ที่ใช้ (input = prompt, output = คำตอบ) — เป็นตัวกำหนดค่าใช้จ่ายและ context window
console.log("TOKENS:", response.usage_metadata);
