import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Provider } from "@nestjs/common";
import { createChatModel, type ProviderName } from "../shared/models.js";

/** token สำหรับฉีด chat model — เทสต์ override ด้วย scripted model ได้โดยไม่แตะโค้ดอื่น */
export const CHAT_MODEL = Symbol("CHAT_MODEL");

/** เลือก provider จาก env `AI_PROVIDER` (groq | deepseek, ค่าเริ่มต้น groq) — DeepSeek ต้องปิด thinking เมื่อใช้ tool calling */
export const chatModelProvider: Provider = {
  provide: CHAT_MODEL,
  useFactory: async (): Promise<BaseChatModel> => {
    const provider = (process.env.AI_PROVIDER as ProviderName | undefined) ?? "groq";
    return createChatModel({ provider, maxTokens: 1500, ...(provider === "deepseek" ? { thinking: false } : {}) });
  },
};
