// 07-05: RunnableLambda
// แนวคิด: RunnableLambda ห่อ "ฟังก์ชันธรรมดา" ให้เป็น Runnable เสียบใน pipeline ได้ — ใช้แปลง input/output เอง
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda } from "@langchain/core/runnables";
import { createChatModel } from "../../src/models/index.js";

const model = await createChatModel({ maxTokens: 1500 });
const prompt = ChatPromptTemplate.fromTemplate("สรุปข้อความนี้ใน 1 ประโยค:\n{text}");

// Input transformation: ทำความสะอาดข้อความก่อนเข้า prompt
const normalize = RunnableLambda.from((raw: string) => ({ text: raw.replace(/\s+/g, " ").trim() }));
// Output transformation: นับคำหลังได้ผลลัพธ์
const withStats = RunnableLambda.from((summary: string) => ({
  summary: summary.trim(),
  characters: summary.trim().length,
}));

const chain = normalize.pipe(prompt).pipe(model).pipe(new StringOutputParser()).pipe(withStats);

const messy = "LangChain   ช่วยให้\n\n ต่อ model, prompt และ tool    เข้าด้วยกัน \n ได้ง่ายขึ้นมาก";
console.log(await chain.invoke(messy));
