// 11-05: Agent Structured Output
// แนวคิด: responseFormat ให้ agent ส่ง "ผลลัพธ์สุดท้าย" เป็น object ตาม Zod schema ที่ result.structuredResponse
// toolStrategy = ใช้ tool calling จำลองการตอบตาม schema (ใช้ได้กว้าง) · providerStrategy = ใช้ structured output ของ provider
import { createAgent, toolStrategy } from "langchain";
import { z } from "zod";
import { createChatModel } from "../../src/models/index.js";
import { searchProduct } from "../../src/tools/index.js";

const schema = z.object({
  productName: z.string().describe("ชื่อสินค้า"),
  price: z.number().describe("ราคาบาท"),
  inStock: z.boolean().describe("มีของหรือไม่"),
});

const agent = createAgent({
  model: await createChatModel({ maxTokens: 2500 }),
  tools: [searchProduct],
  responseFormat: toolStrategy(schema),
});

const r = await agent.invoke({ messages: [{ role: "user", content: "ขอข้อมูล Mechanical Keyboard" }] });
console.log("structuredResponse:", r.structuredResponse);
console.log("typeof price:", typeof r.structuredResponse.price, "(TypeScript รู้ type จาก schema)");
