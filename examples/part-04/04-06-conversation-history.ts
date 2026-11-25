// 04-06: Manual Conversation History
// แนวคิด: "ความจำ" ของแชตบอต = array ที่แอปเก็บเอง แล้วส่งทั้งก้อนทุกครั้ง
// กติกา: เพิ่มข้อความตามลำดับ human → ai → human → ai … เสมอ
import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 1500 });

const history: BaseMessage[] = [new SystemMessage("คุณเป็นผู้ช่วยที่ตอบสั้นกระชับ")];

async function chat(userText: string) {
  history.push(new HumanMessage(userText)); // 1) เพิ่มข้อความผู้ใช้
  const reply = await model.invoke(history); // 2) ส่ง "ทั้งประวัติ"
  history.push(new AIMessage(messageText(reply))); // 3) เก็บคำตอบเข้าประวัติ
  console.log(`คุณ: ${userText}\nAI : ${messageText(reply).trim()}\n`);
}

await chat("สวัสดี ฉันชื่อสมชาย และชอบกินส้มตำ");
await chat("ฉันชื่ออะไร");
await chat("และฉันชอบกินอะไร");
console.log("จำนวน messages ในประวัติ:", history.length);
