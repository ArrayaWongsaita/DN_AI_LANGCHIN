// Workshop 08 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
// รัน: pnpm exec tsx --env-file=.env workshops/part-08/starter/stream-chat.ts
import { createInterface } from "node:readline";
import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { createChatModel } from "../../../src/models/index.js";
import { messageText } from "../../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 2000 });
const history: BaseMessage[] = [];
void [AIMessage, HumanMessage, messageText, model, history];
const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "คุณ: " });
rl.prompt();
for await (const raw of rl) {
  const line = raw.trim();
  // TODO 1: /exit ออก
  // TODO 2: model.stream(history, { signal }) แล้ว process.stdout.write ทีละ chunk
  // TODO 3: วัด TTFT (เวลาถึง chunk แรกที่มีข้อความ) และเวลาทั้งหมด แล้วแสดงหลังตอบจบ
  // TODO 4: Ctrl+C ระหว่างตอบ = abort() เฉพาะคำตอบนั้น แล้วคุยต่อได้ (เก็บ partial ไว้ใน history)
  if (line === "/exit") break;
  rl.prompt();
}
rl.close();
