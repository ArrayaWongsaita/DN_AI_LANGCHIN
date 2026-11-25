import { spawnSync } from "node:child_process";
import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { describe, expect, test } from "vitest";
import { evalCasesToExamples, fromReferenceOutputs, type EvalCase } from "../src/eval/dataset.js";
import {
  llmJudge,
  ruleBased,
  runEval,
  schemaValid,
  toolArgs,
  toolSelection,
  tokenBudget,
  approvalGate,
  mutations,
  terminated,
  type AgentRun,
} from "../src/eval/evaluators.js";
import { createScriptedChatModel } from "../src/utils/scripted-model.js";

const run = (over: Partial<AgentRun> = {}): AgentRun => ({ reply: "ok", toolCalls: [], interrupted: false, tokens: 100, ...over });
const kase = (expected: EvalCase["expected"], id = "c"): EvalCase => ({ id, input: "x", expected });

describe("evaluators", () => {
  test("toolSelection fails on the wrong tool, passes on the right sequence, null when not specified", () => {
    const c = kase({ tools: [{ name: "getTasks" }] });
    expect(toolSelection(c, run({ toolCalls: [{ name: "deleteTask", args: {} }] }))).toMatchObject({ key: "tool_selection", score: 0 });
    expect(toolSelection(c, run({ toolCalls: [{ name: "getTasks", args: {} }] }))).toMatchObject({ score: 1 });
    expect(toolSelection(kase({}), run())).toBeNull();
    expect(toolSelection(kase({ tools: [] }), run())).toMatchObject({ score: 1 }); // คาดหวัง "ไม่เรียก tool เลย"
  });

  test("toolArgs scores the fraction of expected args that match", () => {
    const c = kase({ tools: [{ name: "createTask", args: { title: "A", priority: "high" } }] });
    expect(toolArgs(c, run({ toolCalls: [{ name: "createTask", args: { title: "A", priority: "high" } }] }))).toMatchObject({ score: 1 });
    expect(toolArgs(c, run({ toolCalls: [{ name: "createTask", args: { title: "A" } }] }))).toMatchObject({ score: 0 });
  });

  test("ruleBased checks contains (case-insensitive) and forbidden", () => {
    const c = kase({ contains: ["ซื้อกาแฟ"], forbidden: ["password"] });
    expect(ruleBased(c, run({ reply: "เพิ่มงาน ซื้อกาแฟ แล้ว" }))).toMatchObject({ score: 1 });
    expect(ruleBased(c, run({ reply: "ไม่เกี่ยว" }))).toMatchObject({ score: 0 });
    expect(ruleBased(c, run({ reply: "ซื้อกาแฟ PASSWORD=1234" }))).toMatchObject({ score: 0 });
  });

  test("schemaValid rejects a wrong shape and reports the failing fields", () => {
    const c = kase({ schema: z.object({ title: z.string(), priority: z.enum(["low", "high"]) }) });
    expect(schemaValid(c, run({ structured: { title: "x", priority: "high" } }))).toMatchObject({ score: 1 });
    const bad = schemaValid(c, run({ structured: { title: 1, priority: "urgent" } })) as { score: number; comment?: string };
    expect(bad).toMatchObject({ score: 0 });
    expect(bad.comment).toMatch(/title/);
  });

  test("tokenBudget fails when tokens exceed maxTokens", () => {
    expect(tokenBudget(kase({ maxTokens: 500 }), run({ tokens: 400 }))).toMatchObject({ score: 1 });
    expect(tokenBudget(kase({ maxTokens: 500 }), run({ tokens: 900 }))).toMatchObject({ score: 0 });
  });

  test("approvalGate checks that a destructive call paused for approval", () => {
    expect(approvalGate(kase({ interrupted: true }), run({ interrupted: true }))).toMatchObject({ score: 1 });
    expect(approvalGate(kase({ interrupted: true }), run({ interrupted: false }))).toMatchObject({ score: 0 });
    expect(approvalGate(kase({}), run())).toBeNull();
  });

  test("mutations requires the exact number of real side effects; terminated caps tool calls", () => {
    expect(mutations(kase({ mutations: 0 }), run({ mutations: 0 }))).toMatchObject({ score: 1 });
    expect(mutations(kase({ mutations: 0 }), run({ mutations: 1 }))).toMatchObject({ score: 0, comment: expect.stringMatching(/1/) });
    expect(mutations(kase({ mutations: 0 }), run())).toMatchObject({ score: 1 }); // ไม่ได้ระบุ = 0
    expect(terminated(kase({ maxToolCalls: 2 }), run({ toolCalls: [1, 2, 3].map(() => ({ name: "getTasks", args: {} })) }))).toMatchObject({ score: 0 });
    expect(terminated(kase({}), run())).toBeNull();
  });

  test("llmJudge parses {score, reason}, clamps out-of-range scores and survives garbage", async () => {
    const judgeWith = (text: string) => llmJudge(createScriptedChatModel([new AIMessage(text)]));
    const c = kase({ reference: "ต้องแจ้งว่าไม่มีสิทธิ์ลบ" });
    expect(await judgeWith('{"score": 0.9, "reason": "ตรง"}')(c, run())).toMatchObject({ key: "judge", score: 0.9, comment: "ตรง" });
    expect((await judgeWith('{"score": 7, "reason": "x"}')(c, run()))?.score).toBe(1);
    expect((await judgeWith('{"score": -2, "reason": "x"}')(c, run()))?.score).toBe(0);
    expect(await judgeWith("ขอโทษ ตอบไม่ได้")(c, run())).toMatchObject({ score: 0, comment: expect.stringMatching(/parse/) });
    expect(await judgeWith('```json\n{"score": 0.5, "reason": "ครึ่ง"}\n```')(c, run())).toMatchObject({ score: 0.5 });
  });
});

describe("runEval", () => {
  test("reports 2/3 when one case violates `forbidden`", async () => {
    const cases = [
      kase({ contains: ["สวัสดี"] }, "a"),
      kase({ forbidden: ["secret"] }, "b"),
      kase({ contains: ["ลา"] }, "c"),
    ];
    const replies: Record<string, string> = { a: "สวัสดีครับ", b: "นี่คือ secret", c: "ลาก่อน" };
    const report = await runEval(cases, async (k) => run({ reply: replies[k.id] }), [ruleBased]);
    expect(report).toMatchObject({ pass: 2, total: 3 });
    expect(report.byCase.find((r) => r.id === "b")?.passed).toBe(false);
  });

  test("a case with no applicable evaluator does not count as a pass", async () => {
    const report = await runEval([kase({})], async () => run(), [toolSelection]);
    expect(report).toMatchObject({ pass: 0, total: 1 });
  });

  test("an agent that throws fails that case but not the whole run", async () => {
    const report = await runEval([kase({ contains: ["x"] }, "a"), kase({ contains: ["ok"] }, "b")], async (k) => {
      if (k.id === "a") throw new Error("boom");
      return run();
    }, [ruleBased]);
    expect(report).toMatchObject({ pass: 1, total: 2 });
    expect(report.byCase[0].error).toMatch(/boom/);
  });
});

describe("dataset conversion", () => {
  test("round-trips expected tools/contains/forbidden through LangSmith example format (schema is dropped)", () => {
    const c: EvalCase = { id: "t1", input: "ลบ t2", expected: { tools: [{ name: "deleteTask", args: { id: "t2" } }], contains: ["อนุมัติ"], schema: z.object({}) } };
    const [ex] = evalCasesToExamples([c]);
    expect(ex.inputs).toEqual({ question: "ลบ t2" });
    expect(ex.metadata).toMatchObject({ id: "t1" });
    expect(JSON.parse(JSON.stringify(ex.outputs))).toEqual(ex.outputs); // serialisable
    expect(fromReferenceOutputs(ex.outputs)).toMatchObject({ tools: [{ name: "deleteTask" }], contains: ["อนุมัติ"] });
  });
});

describe("LangSmith examples need the key", () => {
  const env = { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" }; // ไม่มี LANGSMITH_API_KEY
  const exec = (file: string) => spawnSync("npx", ["tsx", file], { env, encoding: "utf8", timeout: 60_000 });

  test.each(["18-08-enable-langsmith-tracing", "18-09-inspect-agent-trace", "18-10-create-evaluation-dataset", "18-12-llm-based-evaluator", "18-13-regression-evaluation"])(
    "%s exits with a Thai message naming LANGSMITH_API_KEY",
    (name) => {
      const r = exec(`examples/part-18/${name}.ts`);
      expect(r.status).not.toBe(0);
      expect(r.stderr + r.stdout).toMatch(/LANGSMITH_API_KEY/);
    },
    60_000,
  );

  test("18-11 rule-based evaluator runs offline", () => {
    const r = exec("examples/part-18/18-11-rule-based-evaluator.ts");
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/ผ่าน \d+\/\d+/);
  }, 60_000);
});
