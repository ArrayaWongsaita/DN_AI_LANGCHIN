// 02-03: Initialize Chat Model
// แนวคิด: initChatModel() สร้าง Chat Model จาก "ชื่อ model + provider"
// ยังไม่ได้เรียก model — แค่สร้าง instance (ไม่เสียโควตา)
import { initChatModel } from "langchain/chat_models/universal";
import { TOKENME_BASE_URL, TOKENME_MODEL } from "../../src/models/index.js";
import { requireEnv } from "../../src/utils/env.js";

const model = await initChatModel(TOKENME_MODEL, {
  modelProvider: "openai", // TokenMe ใช้รูปแบบเดียวกับ OpenAI: เลือก provider "openai" แล้วชี้ baseURL มาที่ TokenMe
  configuration: { baseURL: TOKENME_BASE_URL },
  apiKey: requireEnv("TOKENME_API_KEY"),
  temperature: 0,
});

console.log("สร้าง model สำเร็จ");
console.log("ประเภท:", model.constructor.name);
console.log("มี method invoke:", typeof model.invoke === "function");
