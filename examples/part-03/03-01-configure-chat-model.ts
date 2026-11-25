// 03-01: Configure Chat Model
// แนวคิด: พฤติกรรมของ model ปรับได้ด้วย configuration ตอนสร้าง instance
import { initChatModel } from "langchain/chat_models/universal";
import { TOKENME_BASE_URL, TOKENME_MODEL } from "../../src/models/index.js";
import { requireEnv } from "../../src/utils/env.js";
import { messageText } from "../../src/utils/text.js";

const model = await initChatModel(TOKENME_MODEL, {
  modelProvider: "openai", // TokenMe ใช้รูปแบบเดียวกับ OpenAI: เลือก provider "openai" แล้วชี้ baseURL มาที่ TokenMe
  configuration: { baseURL: TOKENME_BASE_URL },
  apiKey: requireEnv("TOKENME_API_KEY"),
  temperature: 0.2, // ความสุ่ม/ความสร้างสรรค์ของคำตอบ (0 = นิ่งสุด)
  maxTokens: 1000, // เพดาน token ของคำตอบ (รวม token ที่ reasoning model ใช้คิด)
  timeout: 30_000, // ms — ถ้า provider ไม่ตอบภายในเวลานี้ให้ถือว่าล้มเหลว
  maxRetries: 2, // ลองใหม่อัตโนมัติเมื่อเจอ error ชั่วคราว (เช่น 429, 5xx)
  // option เฉพาะ provider ส่งผ่าน modelKwargs: ปิดโหมดคิด (reasoning) ของ TokenMe — ถ้าไม่ปิด token อาจหมดไปกับการคิดจนคำตอบว่าง
  modelKwargs: { chat_template_kwargs: { enable_thinking: false } },
});

const response = await model.invoke("ตั้งชื่อแมวสีส้ม 1 ชื่อ พร้อมเหตุผลสั้นๆ");
console.log(messageText(response));
