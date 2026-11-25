import { AIMessage } from "@langchain/core/messages";
import { RunnableLambda } from "@langchain/core/runnables";
import { describe, expect, test } from "vitest";
import { translateAll, withBackoff } from "../workshops/part-08/solution/batch-translate.js";

/** ดึงข้อความผู้ใช้ที่อยู่ในแท็ก <text> ของ prompt */
const extract = (prompt: string) => /<text>\n([\s\S]*?)\n<\/text>/.exec(prompt)?.[1] ?? "";

/** model ปลอมที่แปลงเป็น "EN:<ข้อความ>" และ track จำนวนที่ทำงานพร้อมกัน */
function trackingModel(delayMs = 20) {
  const state = { running: 0, peak: 0 };
  const model = RunnableLambda.from(async (input: { toString(): string }) => {
    state.running++;
    state.peak = Math.max(state.peak, state.running);
    await new Promise((r) => setTimeout(r, delayMs));
    state.running--;
    const text = input.toString();
    if (text.includes("BOOM")) throw new Error("model พัง");
    return new AIMessage(`EN:${extract(text)}`);
  });
  return { model, state };
}

describe("translateAll", () => {
  test("keeps result order identical to input order", async () => {
    const { model } = trackingModel();
    const out = await translateAll(model, ["ก", "ข", "ค"]);
    expect(out.map((r) => r.ok && r.translation)).toEqual(["EN:ก", "EN:ข", "EN:ค"]);
  });

  test("never exceeds maxConcurrency", async () => {
    const { model, state } = trackingModel();
    await translateAll(model, ["1", "2", "3", "4", "5", "6"], { maxConcurrency: 2 });
    expect(state.peak).toBeLessThanOrEqual(2);
    expect(state.peak).toBeGreaterThan(0);
  });

  test("one failing item does not fail the others", async () => {
    const { model } = trackingModel();
    const out = await translateAll(model, ["ดี", "BOOM", "ครับ"]);
    expect(out[0]).toMatchObject({ ok: true });
    expect(out[1]).toMatchObject({ ok: false, error: expect.stringContaining("model พัง") });
    expect(out[2]).toMatchObject({ ok: true });
  });

  test("empty input list returns empty array without calling the model", async () => {
    const { model, state } = trackingModel();
    expect(await translateAll(model, [])).toEqual([]);
    expect(state.peak).toBe(0);
  });
});

describe("withBackoff", () => {
  test("retries 429 then succeeds", async () => {
    let n = 0;
    const result = await withBackoff(async () => {
      if (++n < 3) throw Object.assign(new Error("429"), { status: 429 });
      return "ok";
    }, { baseMs: 1 });
    expect(result).toBe("ok");
    expect(n).toBe(3);
  });

  test("does not retry 401", async () => {
    let n = 0;
    await expect(
      withBackoff(async () => {
        n++;
        throw Object.assign(new Error("401"), { status: 401 });
      }, { baseMs: 1 }),
    ).rejects.toThrow("401");
    expect(n).toBe(1);
  });

  test("gives up after maxRetries", async () => {
    let n = 0;
    await expect(
      withBackoff(async () => {
        n++;
        throw Object.assign(new Error("429"), { status: 429 });
      }, { maxRetries: 2, baseMs: 1 }),
    ).rejects.toThrow("429");
    expect(n).toBe(3);
  });
});

describe("translateAll retries", () => {
  function flakyModel(failures: Map<string, { status: number; times: number }>) {
    const state = { running: 0, peak: 0, calls: new Map<string, number>() };
    const model = RunnableLambda.from(async (input: { toString(): string }) => {
      const text = extract(input.toString());
      state.calls.set(text, (state.calls.get(text) ?? 0) + 1);
      state.running++;
      state.peak = Math.max(state.peak, state.running);
      await new Promise((r) => setTimeout(r, 10));
      state.running--;
      const f = failures.get(text);
      if (f && (state.calls.get(text) ?? 0) <= f.times) throw Object.assign(new Error(`HTTP ${f.status}`), { status: f.status });
      return new AIMessage(`EN:${text}`);
    });
    return { model, state };
  }

  test("retries of 429 items still respect maxConcurrency", async () => {
    const items = ["1", "2", "3", "4", "5", "6"];
    const { model, state } = flakyModel(new Map(items.map((t) => [t, { status: 429, times: 1 }])));
    const out = await translateAll(model, items, { maxConcurrency: 2, baseMs: 1 });
    expect(out.every((r) => r.ok)).toBe(true);
    expect(state.peak).toBeLessThanOrEqual(2);
  });

  test("non-retryable error (401) is attempted exactly once", async () => {
    const { model, state } = flakyModel(new Map([["bad", { status: 401, times: 99 }]]));
    const out = await translateAll(model, ["ok", "bad"], { baseMs: 1 });
    expect(out[1]).toMatchObject({ ok: false });
    expect(state.calls.get("bad")).toBe(1);
  });

  test("gives up on persistent 429 after maxRetries", async () => {
    const { model, state } = flakyModel(new Map([["x", { status: 429, times: 99 }]]));
    const out = await translateAll(model, ["x"], { maxRetries: 2, baseMs: 1 });
    expect(out[0]).toMatchObject({ ok: false });
    expect(state.calls.get("x")).toBe(3);
  });
});
