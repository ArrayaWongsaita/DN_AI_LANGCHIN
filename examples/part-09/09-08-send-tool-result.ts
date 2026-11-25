// 09-08: Send Tool Result to Model
// แนวคิด: รอบที่ 2 — ส่ง [คำถาม, AIMessage(tool_calls), ToolMessage] กลับให้โมเดล เพื่อให้เรียบเรียงคำตอบสุดท้าย
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { executeToolCalls } from "../../src/agents/execute-tools.js";
import { messageText } from "../../src/utils/text.js";
import { multiply } from "../../src/tools/index.js";

const model = (await createChatModel({ maxTokens: 1500 })).bindTools!([multiply]);

const messages: BaseMessage[] = [new HumanMessage("ซื้อปากกา 1,234 ด้าม ด้ามละ 5,678 บาท รวมกี่บาท (ใช้เครื่องมือคำนวณ)")];
const ai = await model.invoke(messages); // รอบที่ 1: โมเดลขอเรียก tool
messages.push(ai, ...(await executeToolCalls([multiply], ai))); // เราเรียก tool แล้วแนบผล

console.log("ลำดับข้อความ:", messages.map((m) => m.getType()).join(" → "));
const final = await model.invoke(messages); // รอบที่ 2: โมเดลเห็นผลแล้วตอบ
console.log("คำตอบสุดท้าย:", messageText(final).trim());
