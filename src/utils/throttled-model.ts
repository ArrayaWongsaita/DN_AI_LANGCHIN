import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";

/** Error ที่มี .status = 429 เหมือน rate limit จริงจาก provider */
export class RateLimitError extends Error {
  status = 429;
  constructor() {
    super("429 Too Many Requests (จำลอง)");
    this.name = "RateLimitError";
  }
}

class ThrottledMockModel extends BaseChatModel {
  calls = 0;
  constructor(
    private readonly failFirst: number,
    private readonly text: string,
  ) {
    super({ maxRetries: 0 }); // ไม่ retry ภายใน เพื่อให้ตัวอย่างควบคุม retry เอง
  }

  _llmType() {
    return "throttled-mock";
  }

  async _generate(): Promise<ChatResult> {
    this.calls++;
    if (this.calls <= this.failFirst) throw new RateLimitError();
    return { generations: [{ text: this.text, message: new AIMessage(this.text) }] };
  }
}

/** โมเดลปลอมที่ตอบ 429 ใน failFirst ครั้งแรก แล้วค่อยตอบ text — ใช้สาธิต retry/backoff โดยไม่เสียโควตา (Part 08-09) */
export function createThrottledMockModel(opts: { failFirst: number; text: string }): BaseChatModel & { calls: number } {
  return new ThrottledMockModel(opts.failFirst, opts.text);
}
