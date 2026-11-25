// 02-03: Initialize Chat Model
// แนวคิด: initChatModel() สร้าง Chat Model จาก "ชื่อ model + provider"
// ยังไม่ได้เรียก model — แค่สร้าง instance (ไม่เสียโควตา)
import { initChatModel } from "langchain/chat_models/universal";
import { requireEnv } from "../../src/utils/env.js";

const model = await initChatModel("openai/gpt-oss-20b", {
  modelProvider: "groq", // เลือก provider (ต้องติดตั้ง @langchain/groq)
  apiKey: requireEnv("GROQ_API_KEY"),
  temperature: 0,
});

console.log("สร้าง model สำเร็จ");
console.log("ประเภท:", model.constructor.name);
console.log("มี method invoke:", typeof model.invoke === "function");
