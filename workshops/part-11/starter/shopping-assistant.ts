// Workshop 11 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAgent, toolStrategy } from "langchain";
import { z } from "zod";
import { shoppingTools } from "../../../src/tools/shopping.js";

// TODO 1: schema ผลลัพธ์: items[{name, quantity, unitPrice}], total (number), note? (string)  พร้อม .describe()
export const shoppingResultSchema = z.object({});

export function buildShoppingAgent(model: BaseChatModel) {
  // TODO 2: system prompt (ใช้ tool เสมอ ห้ามเดาตัวเลข; หมด/ไม่พบ → ใส่ note ไม่นับในยอด)
  // TODO 3: createAgent({ model, tools: shoppingTools, systemPrompt, responseFormat: toolStrategy(shoppingResultSchema) })
  void [createAgent, toolStrategy, shoppingTools, model];
  throw new Error("TODO: ยังไม่ได้ทำ");
}
