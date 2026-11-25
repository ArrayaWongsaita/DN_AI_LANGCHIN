// 04-08: Interactive CLI Chatbot
// แนวคิด: นำทั้งหมดมารวม — loop รับข้อความ, เก็บประวัติ, คำสั่ง /reset /exit, ตัดประวัติเมื่อยาวเกิน (trimMessages)
// รัน: pnpm play 4-8   (พิมพ์ /exit เพื่อออก)
import { createInterface } from "node:readline";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  trimMessages,
  type BaseMessage,
} from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const MAX_MESSAGES = 12; // เก็บประวัติล่าสุดไม่เกินจำนวนนี้ (ไม่รวม system) เพื่อคุม token

const model = await createChatModel({ maxTokens: 2000 });
const system = new SystemMessage("คุณเป็นผู้ช่วยที่เป็นมิตร ตอบเป็นภาษาไทยสั้นกระชับ");
let history: BaseMessage[] = [];

/** ตัดประวัติเก่าออก โดยคง system ไว้ และให้เริ่มที่ human เสมอ (ลำดับ message ต้องถูกต้อง) */
async function trimmed(): Promise<BaseMessage[]> {
  return trimMessages([system, ...history], {
    maxTokens: MAX_MESSAGES + 1,
    tokenCounter: (msgs) => msgs.length, // นับเป็น "จำนวนข้อความ" แทน token เพื่อให้เข้าใจง่าย
    strategy: "last",
    includeSystem: true,
    startOn: "human",
  });
}

console.log("แชตบอต — พิมพ์ข้อความเพื่อคุย | /reset ล้างประวัติ | /exit ออก");
const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "คุณ > " });
let closed = false;
rl.on("close", () => (closed = true)); // stdin ปิด (Ctrl+D หรือ input จาก pipe หมด)
rl.prompt();

for await (const line of rl) {
  const text = line.trim();
  if (text === "/exit") break;
  if (text === "/reset") {
    history = [];
    console.log("(ล้างประวัติแล้ว)");
  } else if (text) {
    history.push(new HumanMessage(text));
    try {
      const reply = await model.invoke(await trimmed());
      const answer = messageText(reply).trim();
      history.push(new AIMessage(answer));
      console.log(`AI  > ${answer}`);
    } catch (err) {
      history.pop(); // เอาข้อความที่ล้มเหลวออก เพื่อให้ลำดับ human/ai ยังถูกต้อง
      console.log(`❌ เรียก AI ไม่สำเร็จ: ${(err as Error).message}`);
    }
  }
  if (!closed) rl.prompt();
}
rl.close();
console.log("ลาก่อน!");
