import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { initChatModel } from "langchain/chat_models/universal";
import { requireEnv } from "../utils/env.js";

export type ProviderName = "tokenme" | "groq" | "deepseek";

export interface ChatModelOptions {
  provider?: ProviderName;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  maxRetries?: number;
  /** เฉพาะ reasoning model ของ Groq (gpt-oss): ยิ่งต่ำยิ่งคิดน้อย เร็วและประหยัด token — ค่าเริ่มต้น "low" */
  reasoningEffort?: "low" | "medium" | "high";
  /** เฉพาะ DeepSeek: ใส่ false เพื่อปิด thinking mode — จำเป็นเมื่อใช้ structured output / tool calling (Part 06+) */
  thinking?: boolean;
}

/** TokenMe เป็น gateway แบบ OpenAI-compatible — ใช้ client ของ OpenAI ชี้ baseURL มาที่นี่ */
export const TOKENME_BASE_URL = "https://api.tokenme.limited/api/v1";
export const TOKENME_MODEL = "deepseek-ai/deepseek-v4.1-flash-1017";

const DEFAULTS: Record<ProviderName, { model: string; keyName: string }> = {
  tokenme: { model: TOKENME_MODEL, keyName: "TOKENME_API_KEY" },
  groq: { model: "openai/gpt-oss-20b", keyName: "GROQ_API_KEY" },
  deepseek: { model: "deepseek-flash", keyName: "DEEPSEEK_API_KEY" },
};

/**
 * สร้าง Chat Model จาก provider ที่เลือก (ค่าเริ่มต้น: TokenMe deepseek-v4.1-flash)
 * ใช้ initChatModel ข้างใน — ตั้งแต่ Part 04 เป็นต้นไปตัวอย่างจะเรียกฟังก์ชันนี้
 */
export async function createChatModel(opts: ChatModelOptions = {}): Promise<BaseChatModel> {
  const provider = opts.provider ?? "tokenme";
  const { model: defaultModel, keyName } = DEFAULTS[provider];
  const apiKey = requireEnv(keyName);
  const { provider: _p, model, reasoningEffort, thinking, ...rest } = opts;
  const modelName = model ?? defaultModel;
  // gpt-oss เป็น reasoning model: ถ้า effort สูง token อาจหมดไปกับการคิดจนคำตอบว่าง (finish_reason = length)
  const effort = provider === "groq" && modelName.startsWith("openai/gpt-oss") ? (reasoningEffort ?? "low") : undefined;
  return (await initChatModel(modelName, {
    modelProvider: provider === "tokenme" ? "openai" : provider,
    apiKey,
    ...(provider === "tokenme" ? { configuration: { baseURL: TOKENME_BASE_URL } } : {}),
    ...(effort ? { reasoningEffort: effort } : {}),
    // DeepSeek: thinking mode ไม่รองรับ tool_choice ที่ structured output/tool calling ต้องใช้
    ...(provider === "deepseek" && thinking === false ? { modelKwargs: { thinking: { type: "disabled" } } } : {}),
    ...rest,
  })) as unknown as BaseChatModel;
}
