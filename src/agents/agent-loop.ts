import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AIMessage, BaseMessage } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { messageText } from "../utils/text.js";
import { executeToolCalls } from "./execute-tools.js";

export interface LoopEvent {
  type: "model" | "tool";
  iteration: number;
  message: BaseMessage;
}

export interface AgentLoopOptions {
  model: BaseChatModel;
  tools: StructuredToolInterface[];
  messages: BaseMessage[];
  /** เพดานจำนวนรอบที่เรียกโมเดล (ค่าเริ่มต้น 8) */
  maxIterations?: number;
  signal?: AbortSignal;
  onStep?: (event: LoopEvent) => void;
}

export interface AgentLoopResult {
  messages: BaseMessage[];
  finalText: string;
  iterations: number;
  stopReason: "final" | "max_iterations" | "aborted";
}

/**
 * Agent loop แบบเขียนเอง: เรียกโมเดล → ถ้ามี tool_calls ก็รันทุก call (ขนาน, จับคู่ด้วย id) แล้วส่งผลกลับ → วนต่อ
 * หยุดเมื่อ (1) โมเดลไม่ขอ tool แล้ว (2) ครบ maxIterations (3) ถูก abort
 * ไม่แก้ array `messages` ที่ส่งเข้ามา (คืน array ใหม่)
 */
export async function runAgentLoop(opts: AgentLoopOptions): Promise<AgentLoopResult> {
  const { model, tools, signal, onStep, maxIterations = 8 } = opts;
  const messages = [...opts.messages];
  const bound = model.bindTools ? model.bindTools(tools) : model;
  let iterations = 0;
  let last: AIMessage | undefined;

  while (iterations < maxIterations) {
    if (signal?.aborted) return { messages, finalText: last ? messageText(last) : "", iterations, stopReason: "aborted" };

    iterations++;
    last = (await bound.invoke(messages, { signal })) as AIMessage;
    messages.push(last);
    onStep?.({ type: "model", iteration: iterations, message: last });

    if (!last.tool_calls?.length) return { messages, finalText: messageText(last).trim(), iterations, stopReason: "final" };

    for (const result of await executeToolCalls(tools, last)) {
      messages.push(result);
      onStep?.({ type: "tool", iteration: iterations, message: result });
    }
  }

  if (signal?.aborted) return { messages, finalText: messageText(last!).trim(), iterations, stopReason: "aborted" };
  return { messages, finalText: messageText(last!).trim(), iterations, stopReason: "max_iterations" };
}
