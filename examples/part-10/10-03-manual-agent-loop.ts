// 10-03: Manual Agent Loop
// แนวคิด: agent = while loop — เรียกโมเดล, ถ้ามี tool_calls ก็รันแล้ววนใหม่, ถ้าไม่มีก็จบ (พร้อมเพดานจำนวนรอบ)
// ตัวอย่างนี้เขียนวนเองทั้งหมดให้เห็นกลไก; ฟังก์ชันสำเร็จรูปที่ทดสอบแล้วคือ runAgentLoop (src/agents/agent-loop.ts)
import { HumanMessage, type AIMessage, type BaseMessage } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { executeToolCalls } from "../../src/agents/execute-tools.js";
import { messageText } from "../../src/utils/text.js";
import { workshopTools } from "../../src/tools/index.js";

const model = (await createChatModel({ maxTokens: 2000 })).bindTools!(workshopTools);
const messages: BaseMessage[] = [new HumanMessage("ใช้เครื่องมือ: 15 บวก 27 แล้วคูณ 3 ได้เท่าไร")];

const MAX = 6;
let iteration = 0;
while (iteration < MAX) {
  iteration++;
  const ai = (await model.invoke(messages)) as AIMessage;
  messages.push(ai);
  if (!ai.tool_calls?.length) {
    console.log(`จบที่รอบ ${iteration}:`, messageText(ai).trim());
    break;
  }
  for (const c of ai.tool_calls) console.log(`รอบ ${iteration}: ${c.name}(${JSON.stringify(c.args)})`);
  messages.push(...(await executeToolCalls(workshopTools, ai)));
}
if (iteration === MAX) console.log("ครบเพดาน — หยุดเพื่อกัน loop ไม่รู้จบ");
