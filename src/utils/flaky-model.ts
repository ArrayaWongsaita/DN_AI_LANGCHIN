import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { BaseMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";

class FlakyChatModel extends BaseChatModel {
  attempts = 0;
  constructor(
    private readonly inner: BaseChatModel,
    private readonly failTimes: number,
    private readonly errorMessage: string,
    private readonly state: { attempts: number } = { attempts: 0 },
  ) {
    super({});
  }

  _llmType() {
    return "flaky";
  }

  get callCount() {
    return this.state.attempts;
  }

  // agent เรียก bindTools() — ต้องส่งต่อ tools ให้ model จริงข้างใน แต่ยังนับ/ล้มร่วมกัน
  bindTools(tools: Parameters<NonNullable<BaseChatModel["bindTools"]>>[0], kwargs?: Record<string, unknown>) {
    const innerBound = (this.inner.bindTools?.(tools, kwargs) ?? this.inner) as unknown as BaseChatModel;
    return new FlakyChatModel(innerBound, this.failTimes, this.errorMessage, this.state);
  }

  async _generate(messages: BaseMessage[]): Promise<ChatResult> {
    this.state.attempts++;
    if (this.state.attempts <= this.failTimes) throw new Error(`${this.errorMessage} (ครั้งที่ ${this.state.attempts})`);
    const message = await this.inner.invoke(messages);
    return { generations: [{ text: typeof message.content === "string" ? message.content : "", message }] };
  }
}

/** ห่อ model จริงให้ "ล้มชั่วคราว failTimes ครั้งแรก" (เช่น จำลอง 503) แล้วทำงานปกติ — ใช้สาธิต retry/fallback โดยไม่ต้องรอให้ provider ล่มจริง */
export function createFlakyModel(inner: BaseChatModel, failTimes: number, errorMessage = "503 service unavailable") {
  return new FlakyChatModel(inner, failTimes, errorMessage);
}
