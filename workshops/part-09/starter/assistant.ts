// Workshop 09 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { executeToolCalls } from "../../../src/agents/execute-tools.js";
import { workshopTools } from "../../../src/tools/index.js";

/** ถาม 1 คำถาม: model ขอ tool → รันทุก call → ส่งผลกลับ → ได้คำตอบ (Part 10 จะทำเป็น loop) */
export async function askAssistant(model: BaseChatModel, question: string): Promise<{ answer: string; toolsUsed: string[] }> {
  // TODO 1: model.bindTools!(workshopTools) แล้ว invoke [SystemMessage, HumanMessage(question)]
  // TODO 2: ไม่มี tool_calls → คืนคำตอบเลย
  // TODO 3: มี → executeToolCalls(workshopTools, ai) → push ผลกลับ → invoke อีกรอบ → คืนคำตอบ + ชื่อ tool ที่ใช้
  void [executeToolCalls, workshopTools, model, question];
  throw new Error("TODO: ยังไม่ได้ทำ");
}
