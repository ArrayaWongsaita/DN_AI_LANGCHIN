import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, AIMessageChunk, type BaseMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";

class ScriptedChatModel extends BaseChatModel {
  calls = 0;
  seenMessages: BaseMessage[][] = [];
  constructor(private readonly script: AIMessage[]) {
    super({});
  }

  _llmType() {
    return "scripted";
  }

  // agent/loop เรียก bindTools() — โมเดลนี้ตอบตามสคริปต์เสมอ จึงคืนตัวเอง
  bindTools() {
    return this;
  }

  async _generate(messages: BaseMessage[]): Promise<ChatResult> {
    this.seenMessages.push(messages);
    const next = this.script[this.calls++];
    if (!next) throw new Error(`Scripted model: script exhausted after ${this.script.length} response(s)`);
    // withStructuredOutput() ของ langchain-core คาดหวัง AIMessageChunk — แปลงให้ (ยังเป็น message ชนิด "ai" เหมือนเดิม)
    const message = new AIMessageChunk({
      content: next.content,
      tool_calls: next.tool_calls,
      additional_kwargs: next.additional_kwargs,
      response_metadata: next.response_metadata,
      usage_metadata: next.usage_metadata,
      id: next.id,
    });
    return { generations: [{ text: typeof next.content === "string" ? next.content : "", message }] };
  }
}

/** โมเดลปลอมที่ตอบตามสคริปต์ (รวม tool_calls) ตามลำดับ — ใช้ทดสอบ agent loop โดยไม่เรียก API */
export function createScriptedChatModel(script: AIMessage[]): BaseChatModel & { calls: number; seenMessages: BaseMessage[][] } {
  return new ScriptedChatModel(script);
}
