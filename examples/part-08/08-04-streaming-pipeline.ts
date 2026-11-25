// 08-04: Streaming Pipeline
// แนวคิด: chain.stream() สตรีมผ่านทั้ง pipeline ถ้าทุกชิ้นรองรับ — แต่ชิ้นที่ต้องรอ input ครบ (เช่น RunnableLambda ธรรมดา) ทำให้สตรีมกลายเป็นก้อนเดียว
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda } from "@langchain/core/runnables";
import { createChatModel } from "../../src/models/index.js";

const model = await createChatModel({ maxTokens: 2000 });
const prompt = ChatPromptTemplate.fromTemplate("เขียนบทกวีสั้น 3 บรรทัดเกี่ยวกับ{topic}");

async function countChunks(label: string, chain: { stream: (i: { topic: string }) => Promise<AsyncIterable<unknown>> }) {
  let n = 0;
  for await (const _ of await chain.stream({ topic: "ฝน" })) n++;
  console.log(`${label}: ได้ ${n} chunks`);
}

// Prompt → Model → Parser: ทุกชิ้นสตรีมได้ → ได้หลาย chunk
await countChunks("prompt→model→parser          ", prompt.pipe(model).pipe(new StringOutputParser()));

// ต่อ RunnableLambda ธรรมดาท้าย chain: ต้องรอข้อความครบก่อนจึงทำงาน → ผลออกมาก้อนเดียว
const upper = RunnableLambda.from((s: string) => s.toUpperCase());
await countChunks("…→ RunnableLambda (ไม่ stream)", prompt.pipe(model).pipe(new StringOutputParser()).pipe(upper));

// สรุป: ชิ้นส่วนมาตรฐาน (prompt, model, parser) สตรีมต่อกันได้ แต่ฟังก์ชันธรรมดาที่ต้องเห็นข้อมูลครบก่อนจะตัดการสตรีม
// ถ้าต้องแปลงผลระหว่างสตรีม ให้ทำที่ฝั่งผู้รับ (ในลูป for await) แทนการแทรกฟังก์ชันใน chain
