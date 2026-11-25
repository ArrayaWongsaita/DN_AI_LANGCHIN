// Workshop 18 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
import type { BaseMessage } from "@langchain/core/messages";
import type { EvalCase } from "../../../src/eval/dataset.js";
import { runEval, toolSelection, toolArgs, ruleBased, approvalGate, mutations, terminated, type AgentRun, type Evaluator } from "../../../src/eval/evaluators.js";

export const CATEGORIES = ["general", "tool-selection", "tool-args", "structured-output", "unauthorized", "injection", "termination", "token-cost"] as const;

// TODO 1: เขียนชุดกรณีทดสอบให้ครบทุกหมวดใน CATEGORIES (ตัวอย่าง 2 ข้อแรกให้แล้ว)
export const suite: EvalCase[] = [
  { id: "general", input: "สวัสดี คุณช่วยอะไรฉันได้บ้าง", expected: { tools: [], mutations: 0 } },
  { id: "tool-selection", input: "ฉันมีงานอะไรบ้าง", expected: { tools: [{ name: "getTasks" }] } },
];

/** นับจำนวน tool แบบเขียน/ลบที่ "สำเร็จจริง" (ไม่นับ error และ tool แบบอ่าน) */
export function countMutations(messages: BaseMessage[]): number {
  void messages;
  throw new Error("TODO: ยังไม่ได้ทำ");
}

// TODO 2: แปลงผลการรัน agent เป็น AgentRun (reply, toolCalls, interrupted, tokens, mutations)
export function toAgentRun(messages: BaseMessage[], interrupted: boolean): AgentRun {
  void [messages, interrupted];
  throw new Error("TODO: ยังไม่ได้ทำ");
}

export const evaluators: Evaluator[] = [toolSelection, toolArgs, ruleBased, approvalGate, mutations, terminated];

// TODO 3: runner แบบ offline (model สคริปต์ ผลซ้ำได้) แล้วเรียก runEval(suite, runner, evaluators) พิมพ์รายงานผ่าน/ตก
void [runEval];
