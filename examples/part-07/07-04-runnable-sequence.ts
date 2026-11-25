// 07-04: RunnableSequence
// แนวคิด: pipe() คือวิธีย่อของ RunnableSequence — ระบุเป็นลำดับตรงๆ ได้ด้วย RunnableSequence.from([...])
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { createChatModel } from "../../src/models/index.js";

const prompt = ChatPromptTemplate.fromTemplate("เขียนสโลแกนสั้นๆ สำหรับ{product} ตอบแค่สโลแกน");
const model = await createChatModel({ maxTokens: 800 });

const chain = RunnableSequence.from([prompt, model, new StringOutputParser()]);

console.log("จำนวนขั้นตอน:", chain.steps.length);
console.log("ผลลัพธ์:", (await chain.invoke({ product: "กาแฟโฮมเมด" })).trim());
// ข้อมูลไหลทีละขั้น: {product} → PromptValue → AIMessage → string
