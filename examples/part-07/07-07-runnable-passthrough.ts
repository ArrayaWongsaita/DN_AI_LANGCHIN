// 07-07: RunnablePassthrough
// แนวคิด: ส่ง input เดิมต่อไป (passthrough) และ assign() เพิ่ม field ใหม่โดยไม่ทำให้ข้อมูลเดิมหาย
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda, RunnablePassthrough } from "@langchain/core/runnables";
import { createChatModel } from "../../src/models/index.js";

const model = await createChatModel({ maxTokens: 1500 });
const translate = ChatPromptTemplate.fromTemplate("แปลเป็นอังกฤษ ตอบแค่คำแปล: {text}").pipe(model).pipe(new StringOutputParser());

// assign(): เก็บ input เดิม ({ text }) แล้วเพิ่ม field "english" และ "length"
const chain = RunnablePassthrough.assign({
  english: translate, // รับ input ทั้งก้อน แล้วเพิ่มผลลัพธ์เป็น field ใหม่
  length: RunnableLambda.from((input: { text: string }) => input.text.length),
});

console.log(await chain.invoke({ text: "ขอบคุณที่ช่วยเหลือ" }));
// ได้ทั้ง text (เดิม) + english + length — ไม่ต้องเขียนโค้ดประคองข้อมูลเดิมไปเอง
