// 02-04: First Model Invocation
// แนวคิด: model.invoke(input) ส่งข้อความไปแล้วรอผล — ต้องใช้ await เพราะเป็น async (ใช้เวลาเรียกผ่านเครือข่าย)
import { initChatModel } from "langchain/chat_models/universal";
import { requireEnv } from "../../src/utils/env.js";

const model = await initChatModel("openai/gpt-oss-20b", {
  modelProvider: "groq",
  apiKey: requireEnv("GROQ_API_KEY"),
});

console.log("กำลังเรียก model...");
const response = await model.invoke("สวัสดี ช่วยแนะนำตัวสั้นๆ 1 ประโยค");

// response คือ AIMessage (object) ไม่ใช่ string ธรรมดา
console.log(response);
