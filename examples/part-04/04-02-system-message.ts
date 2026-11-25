// 04-02: SystemMessage
// แนวคิด: SystemMessage กำหนด บทบาท / พฤติกรรม / ข้อจำกัด / สไตล์ ของ AI ตลอดบทสนทนา
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 1500 });
const question = new HumanMessage("อธิบาย API คืออะไร");

console.log("=== ไม่มี SystemMessage ===");
console.log(messageText(await model.invoke([question])).trim());

console.log("\n=== มี SystemMessage (บทบาท + ข้อจำกัด + สไตล์) ===");
const system = new SystemMessage(
  [
    "คุณเป็นครูสอนเขียนโปรแกรมให้เด็กมัธยม", // บทบาท
    "อธิบายด้วยอุปมาจากร้านอาหารเท่านั้น", // พฤติกรรม
    "ตอบไม่เกิน 3 ประโยค และห้ามใช้ศัพท์เทคนิคโดยไม่อธิบาย", // ข้อจำกัด/สไตล์
  ].join("\n"),
);
console.log(messageText(await model.invoke([system, question])).trim());
