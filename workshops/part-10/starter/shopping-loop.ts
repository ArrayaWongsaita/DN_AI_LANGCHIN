// Workshop 10 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
import { runAgentLoop } from "../../../src/agents/agent-loop.js";
import { createChatModel, type ProviderName } from "../../../src/models/index.js";
import { add, multiply, searchProduct } from "../../../src/tools/index.js";

export async function shop(question: string, provider?: ProviderName) {
  // TODO 1: system prompt — ห้ามคำนวณเอง ให้ใช้ tool; สินค้าไม่พบ/ไม่พอให้แจ้งตรงๆ ไม่รวมยอด
  // TODO 2: runAgentLoop({ model, tools: [searchProduct, add, multiply], messages, maxIterations: 8, onStep }) แล้วคืนผล
  void [runAgentLoop, createChatModel, add, multiply, searchProduct, question, provider];
  throw new Error("TODO: ยังไม่ได้ทำ");
}
