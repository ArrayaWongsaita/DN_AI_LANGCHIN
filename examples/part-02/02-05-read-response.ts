// 02-05: Read AI Response
// แนวคิด: AIMessage มีหลายส่วน — content (คำตอบ), usage_metadata (token), response_metadata (ข้อมูลจาก provider)
import { initChatModel } from "langchain/chat_models/universal";
import { requireEnv } from "../../src/utils/env.js";

const model = await initChatModel("openai/gpt-oss-20b", {
  modelProvider: "groq",
  apiKey: requireEnv("GROQ_API_KEY"),
});

const response = await model.invoke("ภูเขาที่สูงที่สุดในประเทศไทยคืออะไร ตอบสั้นๆ");

// content ส่วนใหญ่เป็น string; บาง model ส่งเป็น array ของ content blocks จึงเช็กชนิดก่อนใช้
console.log("ชนิดของ content:", typeof response.content);
console.log("content:", response.content);

// usage_metadata: จำนวน token ที่ใช้ (กำหนดค่าใช้จ่าย)
console.log("usage_metadata:", response.usage_metadata);

// response_metadata: ข้อมูลเพิ่มจาก provider เช่น เหตุผลที่หยุด (finish_reason)
console.log("finish_reason:", response.response_metadata?.finish_reason);
console.log("model:", response.response_metadata?.model);
