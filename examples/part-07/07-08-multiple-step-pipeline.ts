// 07-08: Multiple-step Pipeline
// แนวคิด: ต่อหลายขั้นตอน (sequential) + แตกสาขา (parallel) ใน pipeline เดียว
// article → [1] สรุป → [2] จาก "สรุป" ได้ (ชื่อเรื่อง | คำสำคัญ) พร้อมกัน → รวมผลพร้อมเก็บสรุปไว้
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda, RunnableParallel, RunnableSequence } from "@langchain/core/runnables";
import { createChatModel } from "../../src/models/index.js";

const model = await createChatModel({ maxTokens: 1500 });
const toText = new StringOutputParser();

const summarize = ChatPromptTemplate.fromTemplate("สรุปบทความนี้ใน 2 ประโยค:\n{article}").pipe(model).pipe(toText);
const makeTitle = ChatPromptTemplate.fromTemplate("ตั้งชื่อเรื่อง 1 ชื่อจากสรุปนี้ ตอบแค่ชื่อ:\n{summary}").pipe(model).pipe(toText);
const makeKeywords = ChatPromptTemplate.fromTemplate("คำสำคัญ 3 คำจากสรุปนี้ คั่นด้วย , ตอบแค่คำ:\n{summary}").pipe(model).pipe(toText);

const pipeline = RunnableSequence.from([
  // ขั้น 1: สรุป แล้วห่อเป็น { summary }
  RunnableLambda.from(async (input: { article: string }) => ({ summary: (await summarize.invoke(input)).trim() })),
  // ขั้น 2: ขนาน 2 สาขาจาก summary (และส่ง summary ต่อด้วย)
  RunnableParallel.from({
    summary: (x: { summary: string }) => x.summary,
    title: makeTitle,
    keywords: makeKeywords,
  }),
]);

const article =
  "ร้านกาแฟเล็กๆ ในเชียงใหม่เริ่มใช้เมล็ดกาแฟจากเกษตรกรบนดอยโดยตรง ทำให้เกษตรกรมีรายได้เพิ่มขึ้นร้อยละ 30 " +
  "ขณะที่ลูกค้าได้กาแฟสดใหม่ในราคาเดิม ร้านวางแผนขยายโครงการไปยังอีก 3 จังหวัดภายในปีหน้า";
console.log(await pipeline.invoke({ article }));
