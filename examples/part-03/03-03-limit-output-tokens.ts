// 03-03: Limit Output Tokens
// แนวคิด: maxTokens จำกัดความยาวคำตอบ — ถ้าถึงเพดาน finish_reason จะเป็น "length" และคำตอบอาจถูกตัด
// ข้อควรระวัง: reasoning model ใช้ token "คิด" ก่อนตอบ ถ้าตั้งต่ำเกินไปอาจไม่เหลือที่ให้คำตอบเลย
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const prompt = "เล่าประวัติกรุงเทพมหานครโดยสรุป";

// (ก) ปัญหา: เปิดโหมดคิด (ค่าเริ่มต้นของ TokenMe) + maxTokens ต่ำ → token หมดไปกับการคิด ได้คำตอบว่างหรือขาดกลางคัน
// (ข) วิธีแก้: ปิดโหมดคิดด้วย thinking: false (createChatModel ส่ง option เฉพาะ provider ให้) แล้ว token ไปเป็นคำตอบทั้งหมด
const cases = [
  { label: "ก) เปิดโหมดคิด            ", maxTokens: 60, thinking: undefined },
  { label: "ก) เปิดโหมดคิด            ", maxTokens: 300, thinking: undefined },
  { label: "ข) ปิดโหมดคิด             ", maxTokens: 30, thinking: false },
  { label: "ข) ปิดโหมดคิด             ", maxTokens: 300, thinking: false },
];

for (const { label, maxTokens, thinking } of cases) {
  const model = await createChatModel({ maxTokens, ...(thinking === false && { thinking }) });
  const r = await model.invoke(prompt);
  const text = messageText(r);
  console.log(`\n${label} maxTokens=${maxTokens}`);
  console.log("  finish_reason:", r.response_metadata?.finish_reason);
  console.log("  output_tokens:", r.usage_metadata?.output_tokens, "| reasoning:", r.usage_metadata?.output_token_details?.reasoning ?? 0);
  console.log("  ความยาวคำตอบ:", text.length, "ตัวอักษร", text.length === 0 ? "(ว่าง! token หมดไปกับการคิด)" : "");
}
