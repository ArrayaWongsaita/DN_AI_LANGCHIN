// 04-03: AIMessage
// แนวคิด: คำตอบของ model คือ AIMessage — เก็บไว้แล้วส่งกลับเป็นส่วนหนึ่งของ history ได้ และเราสร้างเองก็ได้
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 1500 });

const ai = await model.invoke([new HumanMessage("ผลไม้สีเหลือง 1 ชนิด ตอบสั้นๆ")]);
console.log("เป็น AIMessage:", AIMessage.isInstance(ai));
console.log("type:", ai.type);
console.log("content:", messageText(ai));
console.log("tool_calls:", ai.tool_calls); // ว่าง = model ไม่ได้ขอเรียก tool (Part 09)
console.log("usage:", ai.usage_metadata);

// นำ AIMessage กลับมาใช้: ส่งเป็นประวัติให้ model เพื่อคุยต่อ
const followUp = await model.invoke([
  new HumanMessage("ผลไม้สีเหลือง 1 ชนิด ตอบสั้นๆ"),
  ai, // คำตอบก่อนหน้าของ AI
  new HumanMessage("แล้วสีแดงล่ะ"),
]);
console.log("\nต่อบทสนทนา:", messageText(followUp).trim());

// เราสร้าง AIMessage เองได้ (เช่น จำลองว่า AI เคยตอบอะไร)
const fake = new AIMessage("กล้วย");
console.log("\nสร้างเอง:", fake.type, "→", fake.content);
