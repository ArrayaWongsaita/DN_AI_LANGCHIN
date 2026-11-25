// 11-01: First createAgent()
// แนวคิด: createAgent() คือ agent loop ที่เราเขียนใน Part 10 แบบสำเร็จรูป (เพิ่ม state, streaming, ฯลฯ)
// ตัวอย่างแรกยังไม่มี tool — agent ก็ตอบเหมือนแชตธรรมดา
import { createAgent } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const agent = createAgent({ model: await createChatModel({ maxTokens: 1500 }), tools: [] });

// input คือ state ของ agent: { messages: [...] } (รับทั้ง object { role, content } และ BaseMessage)
const result = await agent.invoke({ messages: [{ role: "user", content: "อธิบายสั้นๆ 2 ประโยคว่า AI agent คืออะไร" }] });

console.log("จำนวนข้อความใน state:", result.messages.length);
console.log("ชนิดข้อความ:", result.messages.map((m) => m.getType()).join(" → "));
console.log("คำตอบ:", messageText(result.messages.at(-1)!).trim());
