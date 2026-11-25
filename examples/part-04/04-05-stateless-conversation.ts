// 04-05: Stateless Conversation
// แนวคิด: LLM ไม่จำการเรียกก่อนหน้า — แต่ละ invoke() เป็นอิสระ ถ้าไม่ส่งประวัติ มันจะไม่รู้เรื่องที่เคยคุย
import { HumanMessage } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 1500 });

const r1 = await model.invoke([new HumanMessage("สวัสดี ฉันชื่อสมชาย")]);
console.log("รอบ 1 | คุณ: สวัสดี ฉันชื่อสมชาย\n       AI:", messageText(r1).trim());

// รอบ 2: ส่งแค่คำถามใหม่ ไม่ได้ส่งรอบ 1 ไปด้วย
const r2 = await model.invoke([new HumanMessage("ฉันชื่ออะไร")]);
console.log("\nรอบ 2 | คุณ: ฉันชื่ออะไร\n       AI:", messageText(r2).trim());
console.log("\n→ model ไม่รู้ เพราะเราไม่ได้ส่งรอบ 1 ให้มัน (stateless)");
