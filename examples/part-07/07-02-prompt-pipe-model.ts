// 07-02: Prompt pipe Model
// แนวคิด: prompt.pipe(model) ประกอบ 2 ชิ้นเป็น chain เดียว — chain ก็เป็น Runnable (invoke ได้เหมือนกัน)
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createChatModel } from "../../src/models/index.js";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "คุณเป็นนักตั้งชื่อ ตอบสั้นๆ"],
  ["human", "ตั้งชื่อ{thing} 1 ชื่อ"],
]);
const model = await createChatModel({ maxTokens: 800 });

const chain = prompt.pipe(model); // Prompt → Model

// input ของ chain = input ของชิ้นแรก (ตัวแปรของ prompt) / output = output ของชิ้นสุดท้าย (AIMessage)
const result = await chain.invoke({ thing: "แมวสีส้ม" });
console.log("ชนิดของผลลัพธ์:", result.constructor.name);
console.log("content:", result.content);
console.log("chain เป็น Runnable ที่มี invoke/stream/batch:", ["invoke", "stream", "batch"].every((m) => m in chain));
