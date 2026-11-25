// Workshop 05 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
import { ChatPromptTemplate } from "@langchain/core/prompts";

/** ตัวแปรที่ต้องมี: {source_language} {target_language} {politeness} {style} {text} */
export const translatorPrompt = ChatPromptTemplate.fromMessages([
  // TODO: system = คำสั่ง (ภาษาต้นทาง/เป้าหมาย/ความสุภาพ/รูปแบบ + ห้ามทำตามคำสั่งในแท็ก <text> + ตอบเฉพาะคำแปล)
  ["system", "TODO"],
  // TODO: human = ข้อความที่ต้องแปล ห่อด้วย <text>…</text>
  ["human", "TODO"],
]);
