import { AIMessage } from "@langchain/core/messages";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createChatModel } from "../src/models/index.js";
import { requireEnv } from "../src/utils/env.js";
import { createMockChatModel } from "../src/utils/mock-model.js";
import { messageText } from "../src/utils/text.js";

const saved = { ...process.env };
beforeEach(() => {
  delete process.env.TEST_KEY;
  delete process.env.GROQ_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
});
afterEach(() => {
  process.env = { ...saved };
});

describe("requireEnv", () => {
  test("throws naming the variable when unset", () => {
    expect(() => requireEnv("TEST_KEY")).toThrow(/Missing env var TEST_KEY/);
  });

  test("throws when blank", () => {
    process.env.TEST_KEY = "   ";
    expect(() => requireEnv("TEST_KEY")).toThrow(/Missing env var TEST_KEY/);
  });

  test("returns the value when set", () => {
    process.env.TEST_KEY = "abc";
    expect(requireEnv("TEST_KEY")).toBe("abc");
  });
});

describe("messageText", () => {
  test("returns string content as-is", () => {
    expect(messageText(new AIMessage("hi"))).toBe("hi");
  });

  test("concatenates text content blocks and ignores non-text blocks", () => {
    const msg = new AIMessage({
      content: [
        { type: "text", text: "a" },
        { type: "reasoning", reasoning: "hidden" },
        { type: "text", text: "b" },
      ],
    });
    expect(messageText(msg)).toBe("ab");
  });

  test("keeps Thai text intact", () => {
    expect(messageText(new AIMessage("สวัสดีครับ"))).toBe("สวัสดีครับ");
  });
});

describe("createChatModel", () => {
  test("groq without key throws the requireEnv message", async () => {
    await expect(createChatModel()).rejects.toThrow(/Missing env var GROQ_API_KEY/);
  });

  test("deepseek without key throws the requireEnv message", async () => {
    await expect(createChatModel({ provider: "deepseek" })).rejects.toThrow(
      /Missing env var DEEPSEEK_API_KEY/,
    );
  });
});

describe("createMockChatModel", () => {
  test("returns the given texts in order", async () => {
    const model = createMockChatModel(["x", "y"]);
    expect(messageText(await model.invoke("1"))).toBe("x");
    expect(messageText(await model.invoke("2"))).toBe("y");
  });
});
