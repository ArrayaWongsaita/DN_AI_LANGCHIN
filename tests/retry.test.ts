import { describe, expect, test } from "vitest";
import { isTransientModelError, retryAsync } from "../src/utils/retry.js";

describe("isTransientModelError", () => {
  test("recognises Groq gpt-oss malformed tool call, 429 and 5xx", () => {
    expect(isTransientModelError(new Error("400 Tool call validation failed ... tool_use_failed"))).toBe(true);
    expect(isTransientModelError(new Error('400 {"code":"output_parse_failed"}'))).toBe(true);
    expect(isTransientModelError(Object.assign(new Error("x"), { status: 429 }))).toBe(true);
    expect(isTransientModelError(Object.assign(new Error("x"), { status: 503 }))).toBe(true);
  });
  test("does not treat auth or validation errors as transient", () => {
    expect(isTransientModelError(Object.assign(new Error("bad key"), { status: 401 }))).toBe(false);
    expect(isTransientModelError(new Error("Received tool input did not match expected schema"))).toBe(false);
  });
});

describe("retryAsync", () => {
  test("retries transient errors then succeeds", async () => {
    let n = 0;
    const out = await retryAsync(async () => {
      if (++n < 3) throw new Error("tool_use_failed");
      return "ok";
    }, { delayMs: 1 });
    expect(out).toBe("ok");
    expect(n).toBe(3);
  });
  test("does not retry non-transient errors", async () => {
    let n = 0;
    await expect(retryAsync(async () => { n++; throw new Error("boom"); }, { delayMs: 1 })).rejects.toThrow("boom");
    expect(n).toBe(1);
  });
  test("gives up after attempts and rethrows the last error", async () => {
    let n = 0;
    await expect(retryAsync(async () => { n++; throw new Error("tool_use_failed " + n); }, { attempts: 2, delayMs: 1 })).rejects.toThrow("tool_use_failed 2");
    expect(n).toBe(2);
  });
});
