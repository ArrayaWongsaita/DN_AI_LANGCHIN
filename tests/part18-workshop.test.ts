import { describe, expect, test } from "vitest";
import { approvalGate, mutations, ruleBased, schemaValid, terminated, tokenBudget, toolArgs, toolSelection, runEval } from "../src/eval/evaluators.js";
import { CATEGORIES, createOfflineRunner, suite } from "../workshops/part-18/solution/eval-suite.js";

const evaluators = [toolSelection, toolArgs, ruleBased, schemaValid, tokenBudget, approvalGate, mutations, terminated];

describe("workshop 18 evaluation suite", () => {
  test("covers all 8 categories exactly once", () => {
    expect(suite.map((c) => c.id).sort()).toEqual([...CATEGORIES].sort());
    expect(CATEGORIES).toHaveLength(8);
  });

  test("offline run with the real middleware stack passes 8/8", async () => {
    const report = await runEval(suite, createOfflineRunner(), evaluators);
    expect(report.byCase.filter((r) => !r.passed).map((r) => `${r.id}: ${r.error ?? r.scores.filter((s) => s.score < 1).map((s) => s.comment).join(";")}`)).toEqual([]);
    expect(report).toMatchObject({ pass: 8, total: 8 });
  });

  test("an agent without role/approval/limit middleware fails unauthorized, injection and termination", async () => {
    const report = await runEval(suite, createOfflineRunner({ unsafe: true }), evaluators);
    const failed = report.byCase.filter((r) => !r.passed).map((r) => r.id).sort();
    expect(failed).toEqual(["injection", "termination", "unauthorized"]);
  });
});
