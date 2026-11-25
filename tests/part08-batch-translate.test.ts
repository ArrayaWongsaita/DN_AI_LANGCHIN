import { AIMessage } from "@langchain/core/messages";
import { RunnableLambda } from "@langchain/core/runnables";
import { describe, expect, test } from "vitest";
import { translateAll, withBackoff } from "../workshops/part-08/solution/batch-translate.js";

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
    return new AIMessage(`EN:${text.split("\n").pop()!.replace(/^Human: /, "")}`);
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
