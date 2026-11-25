// 07-03: StringOutputParser
// แนวคิด: Output Parser แปลง output ของ model เป็นรูปแบบที่ใช้ต่อได้ — StringOutputParser: AIMessage → string
// (ต่างจาก structured output ใน Part 06: parser แปลงผลที่ได้มาแล้ว ส่วน structured output บอก model ให้ตอบตาม schema)
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createChatModel } from "../../src/models/index.js";

const prompt = ChatPromptTemplate.fromTemplate("ผลไม้ที่ขึ้นต้นด้วยตัว {letter} 1 ชนิด ตอบแค่ชื่อ");
const model = await createChatModel({ maxTokens: 800 });

const withoutParser = await prompt.pipe(model).invoke({ letter: "ม" });
console.log("ไม่มี parser →", withoutParser.constructor.name);

const chain = prompt.pipe(model).pipe(new StringOutputParser()); // Prompt → Model → Parser
const text = await chain.invoke({ letter: "ม" });
console.log("มี parser    →", typeof text, JSON.stringify(text));
console.log("ใช้ string ต่อได้ทันที:", text.trim().length, "ตัวอักษร");
