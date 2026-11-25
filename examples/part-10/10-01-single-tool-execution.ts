// 10-01: Single Tool Execution
// แนวคิด: ขั้นตอนเดียวของ agent — ถามโมเดล → โมเดลขอ tool → เรารัน → ส่งผลกลับ → ได้คำตอบ (เขียนมือ ยังไม่มี loop)
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { executeToolCalls } from "../../src/agents/execute-tools.js";
import { messageText } from "../../src/utils/text.js";
import { multiply } from "../../src/tools/index.js";

const model = (await createChatModel({ maxTokens: 2000 })).bindTools!([multiply]);
const messages: BaseMessage[] = [new HumanMessage("ซื้อปากกา 1,234 ด้าม ด้ามละ 5,678 บาท รวมกี่บาท (ใช้เครื่องมือ)")];

const ai = await model.invoke(messages);
console.log("1) โมเดลขอ:", ai.tool_calls?.map((c) => `${c.name}(${JSON.stringify(c.args)})`).join(", "));
messages.push(ai, ...(await executeToolCalls([multiply], ai)));
console.log("2) เรารัน tool แล้วส่งผลกลับ");
console.log("3) คำตอบ:", messageText(await model.invoke(messages)).trim());
