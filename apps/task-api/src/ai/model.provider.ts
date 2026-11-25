import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Provider } from "@nestjs/common";
import { createChatModel, type ProviderName } from "../shared/models.js";

/** token สำหรับฉีด chat model — เทสต์ override ด้วย scripted model ได้โดยไม่แตะโค้ดอื่น */
export const CHAT_MODEL = Symbol("CHAT_MODEL");

/** เลือก provider จาก env `AI_PROVIDER` (tokenme | groq | deepseek, ค่าเริ่มต้น tokenme) */
/** โมเดลสำรอง (ถ้าตั้ง `AI_FALLBACK_PROVIDER=tokenme|groq|deepseek`) — ไม่ตั้ง = null */
export const FALLBACK_MODEL = Symbol("FALLBACK_MODEL");
export const fallbackModelProvider: Provider = {
  provide: FALLBACK_MODEL,
  useFactory: async (): Promise<BaseChatModel | null> => {
    const provider = process.env.AI_FALLBACK_PROVIDER as ProviderName | undefined;
    if (!provider) return null;
    return createChatModel({ provider, maxTokens: 1500, ...(provider === "deepseek" ? { thinking: false } : {}) });
  },
};

export const chatModelProvider: Provider = {
  provide: CHAT_MODEL,
  useFactory: async (): Promise<BaseChatModel> => {
    const provider = (process.env.AI_PROVIDER as ProviderName | undefined) ?? "tokenme";
    return createChatModel({ provider, maxTokens: 1500, ...(provider === "deepseek" ? { thinking: false } : {}) });
  },
};
