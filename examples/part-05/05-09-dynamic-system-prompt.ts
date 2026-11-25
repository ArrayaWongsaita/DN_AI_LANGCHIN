// 05-09: Dynamic System Prompt
// แนวคิด: system prompt เปลี่ยนตามผู้ใช้/สถานการณ์ ด้วย partial variables + การประกอบ prompt จากหลายส่วน
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

type UserLevel = "beginner" | "expert";

// ประกอบส่วนของ system prompt ตามระดับผู้ใช้ (ฟังก์ชันธรรมดา ทดสอบง่าย)
function levelInstruction(level: UserLevel): string {
  return level === "beginner"
    ? "อธิบายด้วยภาษาง่าย มีตัวอย่าง ไม่ใช้ศัพท์เทคนิคโดยไม่อธิบาย"
    : "ตอบกระชับ ใช้ศัพท์เทคนิคได้ และเน้นประเด็นสำคัญ";
}

const base = ChatPromptTemplate.fromMessages([
  ["system", "คุณเป็นติวเตอร์เขียนโปรแกรม วันนี้คือ {today}\n{levelInstruction}\nตอบไม่เกิน 4 บรรทัด"],
  ["human", "{question}"],
]);

// partial(): กำหนดตัวแปรบางตัวล่วงหน้า (ที่นี่ใส่วันที่ปัจจุบัน)
const today = new Date().toLocaleDateString("th-TH", { dateStyle: "long" });
const withDate = await base.partial({ today });
console.log("ตัวแปรที่ยังต้องส่ง:", withDate.inputVariables);

const model = await createChatModel({ maxTokens: 1500 });
for (const level of ["beginner", "expert"] as const) {
  const prompt = await withDate.invoke({ levelInstruction: levelInstruction(level), question: "Closure คืออะไร" });
  console.log(`\n=== ${level} ===\n` + messageText(await model.invoke(prompt)).trim());
}
