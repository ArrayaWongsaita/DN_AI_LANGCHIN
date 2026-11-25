// 08-05: Batch Processing
// แนวคิด: batch() ประมวลผลหลาย input ด้วย chain เดียว ได้ผลลัพธ์เรียงตามลำดับ input
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda } from "@langchain/core/runnables";
import { createChatModel } from "../../src/models/index.js";

const model = await createChatModel({ maxTokens: 1000 });
const chain = ChatPromptTemplate.fromTemplate("แปลเป็นอังกฤษ ตอบแค่คำแปล: {text}").pipe(model).pipe(new StringOutputParser());

const inputs = [{ text: "สวัสดีตอนเช้า" }, { text: "ขอบคุณมาก" }, { text: "ห้องน้ำอยู่ที่ไหน" }, { text: "อร่อยมาก" }];
const results = await chain.batch(inputs); // ผลลัพธ์ index ตรงกับ input
inputs.forEach((input, i) => console.log(`${input.text} → ${results[i].trim()}`));

// returnExceptions (argument ตัวที่ 3): ถ้าบางรายการล้มเหลวไม่ให้ทั้ง batch ล้ม — ได้ Error อยู่ในตำแหน่งนั้นแทน
const strict = RunnableLambda.from((text: string) => {
  if (!text.trim()) throw new Error("ข้อความว่าง");
  return text.toUpperCase();
});
const mixed = await strict.batch(["ok", "", "fine"], undefined, { returnExceptions: true });
console.log("\nreturnExceptions:", mixed.map((r) => (r instanceof Error ? `❌ ${r.message}` : `✅ ${r}`)));
