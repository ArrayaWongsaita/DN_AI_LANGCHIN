// 03-05: Inspect Token Usage
// แนวคิด: token = หน่วยคิดค่าใช้จ่าย/โควตา ดู input, output, total จาก usage_metadata
import { createChatModel } from "../../src/models/index.js";

const model = await createChatModel({ maxTokens: 1500 });

const prompts = {
  สั้น: "สวัสดี",
  ยาว: "อธิบายความแตกต่างระหว่าง AI, Machine Learning และ Deep Learning พร้อมตัวอย่างอย่างละ 1 ข้อ",
};

for (const [label, prompt] of Object.entries(prompts)) {
  const r = await model.invoke(prompt);
  console.log(`\nprompt ${label} (${prompt.length} ตัวอักษร)`);
  console.log("  usage_metadata:", r.usage_metadata);
  // reasoning model บางตัวรายงาน token ที่ใช้คิดแยกไว้ (นับรวมใน output_tokens)
  const details = (r.response_metadata?.usage as { completion_tokens_details?: unknown } | undefined)
    ?.completion_tokens_details;
  console.log("  completion_tokens_details:", details ?? "(provider ไม่ได้ระบุ)");
}
