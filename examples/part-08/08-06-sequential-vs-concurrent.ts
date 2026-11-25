// 08-06: Sequential vs Concurrent
// แนวคิด: งานที่ไม่พึ่งกัน (เรียก API หลายครั้ง) ทำพร้อมกันได้ — เร็วกว่า loop ที่ await ทีละตัวมาก
// batch() vs Promise.all(): batch เป็นของ Runnable (ตั้ง maxConcurrency ได้) / Promise.all ควบคุมเองทั้งหมด
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createChatModel } from "../../src/models/index.js";

const model = await createChatModel({ maxTokens: 1000 });
const chain = ChatPromptTemplate.fromTemplate("บอกเมืองหลวงของ{country} ตอบแค่ชื่อเมือง").pipe(model).pipe(new StringOutputParser());
const inputs = ["ไทย", "ญี่ปุ่น", "ฝรั่งเศส", "บราซิล"].map((country) => ({ country }));

async function time<T>(label: string, fn: () => Promise<T>) {
  const t = performance.now();
  const result = await fn();
  console.log(`${label}: ${Math.round(performance.now() - t)} ms →`, JSON.stringify(result));
}

await time("Sequential (for + await) ", async () => {
  const out: string[] = [];
  for (const input of inputs) out.push((await chain.invoke(input)).trim());
  return out;
});
await time("Concurrent (Promise.all)  ", async () => (await Promise.all(inputs.map((i) => chain.invoke(i)))).map((s) => s.trim()));
await time("Concurrent (chain.batch)  ", async () => (await chain.batch(inputs)).map((s) => s.trim()));
