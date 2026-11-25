// 05-07: MessagesPlaceholder
// แนวคิด: MessagesPlaceholder = ช่องที่เสียบ "array ของ messages" ได้ — ใช้ใส่ประวัติบทสนทนาเข้า prompt
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "คุณเป็นผู้ช่วยที่ตอบสั้นกระชับ"],
  new MessagesPlaceholder("history"), // ประวัติบทสนทนาจะถูกเสียบตรงนี้
  ["human", "{question}"],
]);

const history = [new HumanMessage("ฉันชื่อสมชาย"), new AIMessage("ยินดีที่ได้รู้จักครับสมชาย")];

const promptValue = await prompt.invoke({ history, question: "ฉันชื่ออะไร" });
console.log("messages ที่ส่งให้ model:", promptValue.toChatMessages().map((m) => m.type).join(" → "));

const model = await createChatModel({ maxTokens: 800 });
console.log("คำตอบ:", messageText(await model.invoke(promptValue)).trim());
