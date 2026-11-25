// 09-07: Create ToolMessage
// แนวคิด: ผลของ tool ต้องส่งกลับเป็น ToolMessage ที่มี tool_call_id ตรงกับ call — ไม่งั้นโมเดลไม่รู้ว่าผลนี้ของคำขอไหน
import { ToolMessage } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { multiply } from "../../src/tools/index.js";

const model = (await createChatModel({ maxTokens: 1500 })).bindTools!([multiply]);
const ai = await model.invoke("15 คูณ 4 เท่ากับเท่าไร");
const call = ai.tool_calls![0];

const result = String(await multiply.invoke(call.args as { a: number; b: number }));
const toolMessage = new ToolMessage({ content: result, tool_call_id: call.id!, name: call.name });

console.log("tool_call_id ของคำขอ:", call.id);
console.log("ToolMessage:", { content: toolMessage.content, tool_call_id: toolMessage.tool_call_id, name: toolMessage.name });
// หมายเหตุ: ถ้าส่ง tool.invoke(call) (ทั้ง call object) ได้ ToolMessage กลับมาให้เลย
const direct = await multiply.invoke(call);
console.log("invoke(call) ได้ ToolMessage โดยตรง:", direct.constructor.name, direct.content);
