// 07-06: RunnableParallel
// แนวคิด: ส่ง input เดียวกันให้หลายสาขาทำงานพร้อมกัน แล้วรวมผลเป็น object (key = ชื่อสาขา)
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableParallel } from "@langchain/core/runnables";
import { createChatModel } from "../../src/models/index.js";

const model = await createChatModel({ maxTokens: 1500 });
const parser = new StringOutputParser();

const pros = ChatPromptTemplate.fromTemplate("ข้อดี 1 ข้อของ{topic} ตอบสั้นๆ").pipe(model).pipe(parser);
const cons = ChatPromptTemplate.fromTemplate("ข้อเสีย 1 ข้อของ{topic} ตอบสั้นๆ").pipe(model).pipe(parser);

// ทั้งสองสาขารับ {topic} เหมือนกัน
const analysis = RunnableParallel.from({ pros, cons });

const start = performance.now();
const result = await analysis.invoke({ topic: "การทำงานจากที่บ้าน" });
console.log(result);
console.log(`ใช้เวลา ${Math.round(performance.now() - start)} ms (สองสาขาทำพร้อมกัน)`);
