// 09-05: Inspect Tool Calls
// แนวคิด: AIMessage.tool_calls เป็น array ของ { name, args, id } — ตรวจก่อนรันเสมอ (args มาจากโมเดล = ไม่น่าไว้ใจ)
import { createChatModel } from "../../src/models/index.js";
import { calculator } from "./_calculator.js";

const model = (await createChatModel({ maxTokens: 1500 })).bindTools!([calculator]);

for (const question of ["ลบ 100 ด้วย 37", "สวัสดี ช่วยแนะนำตัวหน่อย"]) {
  const ai = await model.invoke(question);
  console.log(`\nถาม: ${question}`);
  if (!ai.tool_calls?.length) {
    console.log("  ไม่มี tool call → โมเดลตอบเอง:", String(ai.content).slice(0, 80));
    continue;
  }
  for (const call of ai.tool_calls) {
    console.log(`  name=${call.name}  id=${call.id}  args=${JSON.stringify(call.args)}`);
  }
  console.log("  invalid_tool_calls:", ai.invalid_tool_calls?.length ?? 0);
}
