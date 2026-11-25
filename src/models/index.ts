import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { initChatModel } from "langchain/chat_models/universal";
import { requireEnv } from "../utils/env.js";

export type ProviderName = "groq" | "deepseek";

export interface ChatModelOptions {
  provider?: ProviderName;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  maxRetries?: number;
  /** เฉพาะ reasoning model ของ Groq (gpt-oss): ยิ่งต่ำยิ่งคิดน้อย เร็วและประหยัด token — ค่าเริ่มต้น "low" */
  reasoningEffort?: "low" | "medium" | "high";
}

const DEFAULTS: Record<ProviderName, { model: string; keyName: string }> = {
  groq: { model: "openai/gpt-oss-20b", keyName: "GROQ_API_KEY" },
  deepseek: { model: "deepseek-flash", keyName: "DEEPSEEK_API_KEY" },
};

/**
 * สร้าง Chat Model จาก provider ที่เลือก (ค่าเริ่มต้น: Groq openai/gpt-oss-20b)
 * ใช้ initChatModel ข้างใน — ตั้งแต่ Part 04 เป็นต้นไปตัวอย่างจะเรียกฟังก์ชันนี้
 */
export async function createChatModel(opts: ChatModelOptions = {}): Promise<BaseChatModel> {
  const provider = opts.provider ?? "groq";
  const { model: defaultModel, keyName } = DEFAULTS[provider];
  const apiKey = requireEnv(keyName);
  const { provider: _p, model, reasoningEffort, ...rest } = opts;
  const modelName = model ?? defaultModel;
  // gpt-oss เป็น reasoning model: ถ้า effort สูง token อาจหมดไปกับการคิดจนคำตอบว่าง (finish_reason = length)
  const effort = provider === "groq" && modelName.startsWith("openai/gpt-oss") ? (reasoningEffort ?? "low") : undefined;
  return (await initChatModel(modelName, {
    modelProvider: provider,
    apiKey,
    ...(effort ? { reasoningEffort: effort } : {}),
    ...rest,
  })) as unknown as BaseChatModel;
}
