// 09-10: Multiple Tool Calls
// หมายเหตุ: ใช้ DeepSeek (thinking ปิด) เพราะ Groq gpt-oss-20b มักขอทีละ call — โมเดลแต่ละตัวต่างกัน อย่าสมมติว่าจะได้ parallel calls เสมอ
// แนวคิด: โมเดลอาจขอหลาย call ใน AIMessage เดียว (parallel tool calls) — ต้องตอบทุก call และจับคู่ด้วย tool_call_id
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { executeToolCalls } from "../../src/agents/execute-tools.js";
import { messageText } from "../../src/utils/text.js";
import { workshopTools } from "../../src/tools/index.js";

const model = (await createChatModel({ provider: "deepseek", thinking: false, maxTokens: 2000 })).bindTools!(workshopTools);
const messages: BaseMessage[] = [new HumanMessage("ขอสภาพอากาศของเชียงใหม่ ภูเก็ต และกรุงเทพ พร้อมกัน (เรียก tool ทั้งสามเมืองในคราวเดียว) แล้วสรุปสั้นๆ")];

const ai = await model.invoke(messages);
console.log(`โมเดลขอ ${ai.tool_calls?.length ?? 0} call:`);
ai.tool_calls?.forEach((c) => console.log(`  id=${c.id} ${c.name}(${JSON.stringify(c.args)})`));

const results = await executeToolCalls(workshopTools, ai); // รันพร้อมกัน ผลเรียงตาม call
results.forEach((r) => console.log(`  ผล id=${r.tool_call_id}: ${r.content}`));

messages.push(ai, ...results);
const final = await model.invoke(messages);
console.log("คำตอบ:", messageText(final).trim() || `(ว่าง — โมเดลขอ tool เพิ่มอีก ${final.tool_calls?.length ?? 0} call)`);
