// 04-07: Reset Conversation
// แนวคิด: เริ่มบทสนทนาใหม่ = ล้างประวัติ (คง SystemMessage ไว้) — model จะ "ลืม" ทุกอย่างก่อนหน้า
import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 1500 });
const system = new SystemMessage("คุณเป็นผู้ช่วยที่ตอบสั้นกระชับ");
let history: BaseMessage[] = [system];

async function chat(userText: string) {
  history.push(new HumanMessage(userText));
  const reply = await model.invoke(history);
  history.push(new AIMessage(messageText(reply)));
  console.log(`คุณ: ${userText}\nAI : ${messageText(reply).trim()}\n`);
}

function reset() {
  history = [system]; // เก็บเฉพาะ system message
  console.log("--- reset: ล้างประวัติแล้ว ---\n");
}

await chat("ฉันชื่อสมชาย");
await chat("ฉันชื่ออะไร"); // จำได้
reset();
await chat("ฉันชื่ออะไร"); // ลืมแล้ว
