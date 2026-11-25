// 03-03: Limit Output Tokens
// แนวคิด: maxTokens จำกัดความยาวคำตอบ — ถ้าถึงเพดาน finish_reason จะเป็น "length" และคำตอบอาจถูกตัด
// ข้อควรระวัง: reasoning model (เช่น gpt-oss) ใช้ token "คิด" ก่อนตอบ ถ้าตั้งต่ำเกินไปอาจไม่เหลือที่ให้คำตอบเลย
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const prompt = "เล่าประวัติกรุงเทพมหานครโดยสรุป";

// (ก) ปัญหา: reasoning effort ระดับปานกลาง + maxTokens ต่ำ → token หมดไปกับการคิด ได้คำตอบว่าง
// (ข) วิธีแก้: createChatModel ตั้ง reasoningEffort "low" เป็นค่าเริ่มต้นให้ gpt-oss
const cases = [
  { label: "ก) reasoningEffort=high  ", maxTokens: 60, reasoningEffort: "high" as const },
  { label: "ข) ค่าเริ่มต้น (low)      ", maxTokens: 30, reasoningEffort: undefined },
  { label: "ข) ค่าเริ่มต้น (low)      ", maxTokens: 300, reasoningEffort: undefined },
  { label: "ข) ค่าเริ่มต้น (low)      ", maxTokens: 3000, reasoningEffort: undefined },
];

for (const { label, maxTokens, reasoningEffort } of cases) {
  const model = await createChatModel({ maxTokens, ...(reasoningEffort && { reasoningEffort }) });
  const r = await model.invoke(prompt);
  const text = messageText(r);
  console.log(`\n${label} maxTokens=${maxTokens}`);
  console.log("  finish_reason:", r.response_metadata?.finish_reason);
  console.log("  output_tokens:", r.usage_metadata?.output_tokens);
  console.log("  ความยาวคำตอบ:", text.length, "ตัวอักษร", text.length === 0 ? "(ว่าง! token หมดไปกับการคิด)" : "");
}
