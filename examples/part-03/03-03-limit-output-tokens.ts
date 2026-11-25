// 03-03: Limit Output Tokens
// แนวคิด: maxTokens จำกัดความยาวคำตอบ — ถ้าถึงเพดาน finish_reason จะเป็น "length" และคำตอบอาจถูกตัด
// ข้อควรระวัง: reasoning model (เช่น gpt-oss) ใช้ token "คิด" ก่อนตอบ ถ้าตั้งต่ำเกินไปอาจไม่เหลือที่ให้คำตอบเลย
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const prompt = "เล่าประวัติกรุงเทพมหานครโดยสรุป";

for (const maxTokens of [30, 300, 3000]) {
  const model = await createChatModel({ maxTokens });
  const r = await model.invoke(prompt);
  const text = messageText(r);
  console.log(`\nmaxTokens=${maxTokens}`);
  console.log("  finish_reason:", r.response_metadata?.finish_reason);
  console.log("  output_tokens:", r.usage_metadata?.output_tokens);
  console.log("  ความยาวคำตอบ:", text.length, "ตัวอักษร", text.length === 0 ? "(ว่าง! token หมดไปกับการคิด)" : "");
}
