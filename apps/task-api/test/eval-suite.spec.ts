import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { cases, evaluators, regressedRunner, runSuite, standardRunner } from "../eval/suite.js";
import { hasDb, makeApp } from "./helpers.js";

describe.skipIf(!hasDb)("milestone 12 — offline AI evaluation suite", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  beforeAll(async () => (ctx = await makeApp()));
  afterAll(async () => ctx.app.close());

  test("covers every outline category", () => {
    const tags = new Set(cases.map((c) => c.category));
    expect([...tags].sort()).toEqual(["approval", "authorization", "create-update", "grounding", "no-tool", "retrieval", "tool-selection"]);
    expect(cases.length).toBeGreaterThanOrEqual(10);
  });

  test("the real agent passes every case (deterministic, scripted model, real DB + guards)", async () => {
    const report = await runSuite(cases, standardRunner(ctx), evaluators);
    const failed = report.byCase.filter((r) => !r.passed).map((r) => `${r.id}: ${r.error ?? r.scores.filter((s) => s.score < 1).map((s) => s.comment).join("; ")}`);
    expect(failed).toEqual([]);
    expect(report.pass).toBe(report.total);
  });

  test("a regressed agent (no approval middleware, trusts a model-supplied userId) FAILS the matching cases", async () => {
    const report = await runSuite(cases, regressedRunner(ctx), evaluators);
    const failed = new Set(report.byCase.filter((r) => !r.passed).map((r) => r.id));
    expect(failed.has("approval-delete-own")).toBe(true); // ลบทันที ไม่หยุดรออนุมัติ
    expect(failed.has("authz-delete-foreign")).toBe(true); // ลบงานของคนอื่นได้จริง
    expect(failed.has("authz-delete-foreign-approved")).toBe(true); // อนุมัติแล้วลบงานของคนอื่นได้จริง
    expect(failed.has("authz-model-userid")).toBe(true); // เชื่อ userId ที่ model ส่งมา
    expect(report.pass).toBeLessThan(report.total);
  });
});
