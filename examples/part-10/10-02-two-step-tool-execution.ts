// 10-02: Two-step Tool Execution
// แนวคิด: งานที่ต้องใช้ tool สองขั้นต่อเนื่อง — เขียนมือเรียกโมเดล 3 รอบ (ซ้ำซ้อนมาก → เหตุผลที่ต้องมี loop)
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { executeToolCalls } from "../../src/agents/execute-tools.js";
import { messageText } from "../../src/utils/text.js";
import { add, multiply } from "../../src/tools/index.js";

const tools = [add, multiply];
const model = (await createChatModel({ maxTokens: 2000 })).bindTools!(tools);
const messages: BaseMessage[] = [new HumanMessage("ให้ใช้เครื่องมือเท่านั้น: เอา 15 บวก 27 ก่อน แล้วนำผลลัพธ์ไปคูณ 3 ได้เท่าไร")];

for (let round = 1; round <= 3; round++) { // เขียนซ้ำ 3 รอบแบบมือ — ลองเปลี่ยนเลข 3 เป็น 2 แล้วดูว่าเกิดอะไร
  const ai = await model.invoke(messages);
  messages.push(ai);
  if (!ai.tool_calls?.length) {
    console.log(`รอบ ${round}: คำตอบสุดท้าย →`, messageText(ai).trim());
    break;
  }
  console.log(`รอบ ${round}: ขอ`, ai.tool_calls.map((c) => `${c.name}(${JSON.stringify(c.args)})`).join(", "));
  messages.push(...(await executeToolCalls(tools, ai)));
}
