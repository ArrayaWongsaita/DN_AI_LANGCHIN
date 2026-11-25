import type { EvalCase } from "./dataset.js";
import { fromReferenceOutputs } from "./dataset.js";
import type { AgentRun, Evaluator } from "./evaluators.js";

/** แปลง Evaluator ของเรา → รูปแบบที่ `evaluate()` ของ LangSmith เรียก ({inputs, outputs, referenceOutputs}) — evaluator ที่ไม่เกี่ยวกับกรณีนั้นคืน [] (ไม่ลงคะแนน) */
export function toLangSmithEvaluator(ev: Evaluator) {
  return async ({ inputs, outputs, referenceOutputs }: { inputs: Record<string, unknown>; outputs: Record<string, unknown>; referenceOutputs?: Record<string, unknown> }) => {
    const c: EvalCase = { id: "langsmith", input: String(inputs.question ?? ""), expected: fromReferenceOutputs(referenceOutputs) };
    const s = await ev(c, outputs as unknown as AgentRun);
    return s ? [{ key: s.key, score: s.score, comment: s.comment }] : [];
  };
}
