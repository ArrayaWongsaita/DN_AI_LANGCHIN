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
  const { provider: _p, model, ...rest } = opts;
  return (await initChatModel(model ?? defaultModel, {
    modelProvider: provider,
    apiKey,
    ...rest,
  })) as unknown as BaseChatModel;
}
