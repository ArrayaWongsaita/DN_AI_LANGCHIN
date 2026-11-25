// 05-02: PromptTemplate
// แนวคิด: PromptTemplate = แม่แบบข้อความที่มีช่อง {ตัวแปร} — แยก "รูปแบบ" ออกจาก "ข้อมูล"
import { PromptTemplate } from "@langchain/core/prompts";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const template = PromptTemplate.fromTemplate("อธิบายเรื่อง {topic} ให้เด็กประถมเข้าใจ ไม่เกิน 2 ประโยค");

// format(): ได้ string
const text = await template.format({ topic: "ภาวะโลกร้อน" });
console.log("format() →", text);

// invoke(): ได้ PromptValue (ส่งต่อเข้า model ได้โดยตรง)
const promptValue = await template.invoke({ topic: "ภาวะโลกร้อน" });
console.log("invoke() → PromptValue:", promptValue.constructor.name, "| toString:", promptValue.toString());

const model = await createChatModel({ maxTokens: 1500 });
console.log("\nคำตอบ:", messageText(await model.invoke(promptValue)).trim());
console.log("ตัวแปรของ template:", template.inputVariables);
