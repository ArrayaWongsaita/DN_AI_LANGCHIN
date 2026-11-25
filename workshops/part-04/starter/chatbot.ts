// Workshop 04 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
// รัน: pnpm exec tsx --env-file=.env workshops/part-04/starter/chatbot.ts
import { createInterface } from "node:readline";
import { AIMessage, HumanMessage, SystemMessage, trimMessages, type BaseMessage } from "@langchain/core/messages";
import { createChatModel } from "../../../src/models/index.js";
import { messageText } from "../../../src/utils/text.js";

const MAX_MESSAGES = 20;
const model = await createChatModel({ maxTokens: 2000 });
const system = new SystemMessage("TODO: เขียน system prompt ของผู้ช่วย");
const history: BaseMessage[] = [];
let totalTokens = 0;
void [AIMessage, HumanMessage, trimMessages, messageText, model, system, history, MAX_MESSAGES];

const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "คุณ > " });
rl.prompt();
for await (const line of rl) {
  const text = line.trim();
  // TODO 1: /exit ออก · /reset ล้างประวัติ · /history แสดงประวัติ
  // TODO 2: ข้อความปกติ → push HumanMessage → trimMessages (เหลือ MAX_MESSAGES) → model.invoke → push AIMessage → แสดงคำตอบ
  // TODO 3: ถ้าเรียก AI ล้มเหลว ต้องถอด HumanMessage ล่าสุดออก (ไม่ให้ history ค้างครึ่งทาง)
  // TODO 4: สะสม reply.usage_metadata?.total_tokens ใน totalTokens
  if (text === "/exit") break;
  rl.prompt();
}
rl.close();
console.log(`จบการสนทนา — ใช้ token รวม ${totalTokens}`);
