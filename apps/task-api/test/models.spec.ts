import { afterEach, describe, expect, test } from "vitest";
import { chatModelOptions } from "../src/ai/model.provider.js";
import { createChatModel } from "../src/shared/models.js";

describe("chat model configuration", () => {
  const saved = process.env.TOKENME_API_KEY;
  afterEach(() => (process.env.TOKENME_API_KEY = saved));

  test("tokenme with thinking:false turns reasoning off through chat_template_kwargs (otherwise reasoning eats the token budget)", async () => {
    process.env.TOKENME_API_KEY = "test-key-not-real";
    const model = (await createChatModel({ provider: "tokenme", thinking: false })) as unknown as { _defaultConfig: { modelKwargs?: Record<string, unknown>; configuration?: { baseURL?: string } } };
    expect(model._defaultConfig.configuration?.baseURL).toBe("https://api.tokenme.limited/api/v1");
    expect(model._defaultConfig.modelKwargs).toMatchObject({ chat_template_kwargs: { enable_thinking: false } });
  });

  test("the app turns thinking off for tokenme and deepseek, and keeps groq as is", () => {
    expect(chatModelOptions("tokenme")).toMatchObject({ provider: "tokenme", thinking: false });
    expect(chatModelOptions("deepseek")).toMatchObject({ provider: "deepseek", thinking: false });
    expect(chatModelOptions("groq")).not.toHaveProperty("thinking");
  });
});
