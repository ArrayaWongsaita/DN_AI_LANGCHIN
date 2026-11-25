// Workshop 11 — เฉลย: AI Shopping Assistant ด้วย createAgent + structured output
// ใช้: pnpm exec tsx --env-file=.env workshops/part-11/solution/shopping-assistant.ts "<คำถาม>" [groq|deepseek]
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAgent, toolStrategy } from "langchain";
import { z } from "zod";
import { createChatModel, type ProviderName } from "../../../src/models/index.js";
import { shoppingTools } from "../../../src/tools/shopping.js";
import { retryAsync } from "../../../src/utils/retry.js";
import { isMain } from "../../../src/utils/is-main.js";

export const shoppingResultSchema = z.object({
  items: z.array(z.object({ name: z.string(), quantity: z.number(), unitPrice: z.number() })).describe("สินค้าที่คิดเงินได้จริง (ไม่รวมที่หมด/ไม่พบ)"),
  total: z.number().describe("ยอดรวมเป็นบาท (0 ถ้าไม่มีรายการ)"),
  note: z.string().optional().describe("หมายเหตุ เช่น สินค้าที่หมดหรือไม่พบ"),
});
export type ShoppingResult = z.infer<typeof shoppingResultSchema>;

const SYSTEM = [
  "คุณเป็นผู้ช่วยขายของ ใช้เครื่องมือเสมอสำหรับราคา สต็อก และยอดรวม ห้ามเดาตัวเลข",
  "calculateTotal ตรวจชื่อสินค้าและสต็อกให้แล้ว — ไม่ต้องเรียก getPrice/checkStock ซ้ำถ้าไม่จำเป็น เพื่อประหยัดจำนวนรอบ",
  "ค้นหาสินค้าด้วยชื่อตามที่ผู้ใช้พิมพ์ ห้ามแปลเป็นภาษาอื่น ถ้าค้นไม่พบให้ดูรายชื่อสินค้าที่ tool บอกแล้วลองใหม่",
  "ถ้าสินค้าไม่พบหรือคงเหลือไม่พอ ให้ใส่เหตุผลใน note และไม่นับสินค้านั้นในยอดรวม",
].join("\n");

export function buildShoppingAgent(model: BaseChatModel) {
  return createAgent({ model, tools: shoppingTools, systemPrompt: SYSTEM, responseFormat: toolStrategy(shoppingResultSchema) });
}

if (isMain(import.meta.url)) {
  const [question, provider] = process.argv.slice(2);
  if (!question || (provider && provider !== "groq" && provider !== "deepseek")) {
    console.log('วิธีใช้: shopping-assistant.ts "<คำถาม>" [groq|deepseek]');
    process.exit(1);
  }
  try {
    const model = await createChatModel({ provider: provider as ProviderName | undefined, thinking: false, maxTokens: 3000 });
    const agent = buildShoppingAgent(model);
    // retryAsync: Groq gpt-oss บางครั้งทำชื่อ tool เพี้ยน (400 tool_use_failed) — ลองใหม่เฉพาะ error ชั่วคราว
    const r = await retryAsync(() => agent.invoke({ messages: [{ role: "user", content: question }] }, { recursionLimit: 20 }));
    console.log(JSON.stringify(r.structuredResponse, null, 2));
  } catch (err) {
    console.error(`❌ ${(err as Error).message.split("\n")[0]}`);
    process.exit(1);
  }
}
