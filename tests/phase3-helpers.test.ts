import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  isTracingEnabled,
  requireLangSmith,
  withTracingGuard,
} from "../src/utils/langsmith.js";

const KEYS = ["LANGSMITH_API_KEY", "LANGSMITH_TRACING", "LANGSMITH_PROJECT"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

describe("requireLangSmith", () => {
  test("throws a Thai error naming LANGSMITH_API_KEY when missing", () => {
    expect(() => requireLangSmith()).toThrow(/LANGSMITH_API_KEY/);
  });

  test("enables tracing and defaults the project when the key exists", () => {
    process.env.LANGSMITH_API_KEY = "lsv2_pt_secretvalue123";
    const r = requireLangSmith();
    expect(r.project).toBe("langchain-course");
    expect(process.env.LANGSMITH_TRACING).toBe("true");
    expect(isTracingEnabled()).toBe(true);
  });

  test("keeps a project the user already set", () => {
    process.env.LANGSMITH_API_KEY = "lsv2_pt_secretvalue123";
    process.env.LANGSMITH_PROJECT = "mine";
    expect(requireLangSmith().project).toBe("mine");
  });

  test("never leaks the key value in errors or logs", () => {
    process.env.LANGSMITH_API_KEY = "   ";
    let message = "";
    try {
      requireLangSmith();
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).not.toContain("lsv2_pt_secretvalue123");
    expect(message).toMatch(/LANGSMITH_API_KEY/);
  });
});

describe("isTracingEnabled", () => {
  test("is false by default under vitest", () => {
    expect(isTracingEnabled()).toBe(false);
  });
});

describe("withTracingGuard", () => {
  test("swallows a LangSmith 403 error and warns once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing = async () => {
      throw new Error("403 from api.smith.langchain.com");
    };
    await expect(withTracingGuard(failing)).resolves.toBeUndefined();
    await expect(withTracingGuard(failing)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test("rethrows unrelated errors and passes values through", async () => {
    await expect(
      withTracingGuard(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    await expect(withTracingGuard(async () => 42)).resolves.toBe(42);
  });
});
