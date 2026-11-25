// Workshop 04 — เฉลย: CLI Chatbot ที่จำบทสนทนาได้
// คำสั่ง: /history ดูประวัติ · /reset ล้างประวัติ · /exit ออก
// ตัดประวัติเก่าเมื่อเกิน MAX_MESSAGES และสรุป token ที่ใช้ตอนจบ
import { createInterface } from "node:readline";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  trimMessages,
  type BaseMessage,
} from "@langchain/core/messages";
import { createChatModel } from "../../../src/models/index.js";
import { messageText } from "../../../src/utils/text.js";

const MAX_MESSAGES = 20;
const model = await createChatModel({ maxTokens: 2000 });
const system = new SystemMessage("คุณคือผู้ช่วยส่วนตัวที่เป็นมิตร ตอบเป็นภาษาไทยสั้นกระชับ และจำข้อมูลที่ผู้ใช้เล่าให้ฟัง");

let history: BaseMessage[] = [];
let totalTokens = 0;

const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "คุณ > " });
let closed = false;
rl.on("close", () => (closed = true));
console.log("CLI Chatbot — /history /reset /exit");
rl.prompt();

for await (const line of rl) {
  const text = line.trim();
  if (text === "/exit") break;
  if (text === "/reset") {
    history = [];
    console.log("(ล้างประวัติแล้ว)");
  } else if (text === "/history") {
    console.log(`(ประวัติ ${history.length} ข้อความ)`);
    for (const m of history) console.log(`  [${m.type}] ${messageText(m).slice(0, 60)}`);
  } else if (text) {
    history.push(new HumanMessage(text));
    try {
      const input = await trimMessages([system, ...history], {
        maxTokens: MAX_MESSAGES + 1,
        tokenCounter: (msgs) => msgs.length,
        strategy: "last",
        includeSystem: true,
        startOn: "human",
      });
      const reply = await model.invoke(input);
      totalTokens += reply.usage_metadata?.total_tokens ?? 0;
      const answer = messageText(reply).trim();
      history.push(new AIMessage(answer));
      console.log(`AI  > ${answer}`);
    } catch (err) {
      history.pop();
      console.log(`❌ เรียก AI ไม่สำเร็จ: ${(err as Error).message}`);
    }
  }
  if (!closed) rl.prompt();
}
rl.close();
console.log(`\nจบการสนทนา — ใช้ token รวม ${totalTokens}`);
