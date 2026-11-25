// 03-01: Configure Chat Model
// แนวคิด: พฤติกรรมของ model ปรับได้ด้วย configuration ตอนสร้าง instance
import { initChatModel } from "langchain/chat_models/universal";
import { requireEnv } from "../../src/utils/env.js";
import { messageText } from "../../src/utils/text.js";

const model = await initChatModel("openai/gpt-oss-20b", {
  modelProvider: "groq",
  apiKey: requireEnv("GROQ_API_KEY"),
  temperature: 0.2, // ความสุ่ม/ความสร้างสรรค์ของคำตอบ (0 = นิ่งสุด)
  maxTokens: 1000, // เพดาน token ของคำตอบ (รวม token ที่ reasoning model ใช้คิด)
  timeout: 30_000, // ms — ถ้า provider ไม่ตอบภายในเวลานี้ให้ถือว่าล้มเหลว
  maxRetries: 2, // ลองใหม่อัตโนมัติเมื่อเจอ error ชั่วคราว (เช่น 429, 5xx)
  // option เฉพาะ provider (Groq + gpt-oss): จำกัดความพยายามในการคิด — ถ้าไม่ตั้ง token อาจหมดไปกับการคิดจนคำตอบว่าง
  reasoningEffort: "low",
});

const response = await model.invoke("ตั้งชื่อแมวสีส้ม 1 ชื่อ พร้อมเหตุผลสั้นๆ");
console.log(messageText(response));
