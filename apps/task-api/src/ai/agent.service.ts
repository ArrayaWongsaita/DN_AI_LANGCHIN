import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { isAIMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { Inject, Injectable } from "@nestjs/common";
import { createAgent } from "langchain";
import { z } from "zod";
import { TasksService } from "../tasks/tasks.service.js";
import { retryAsync } from "../shared/retry.js";
import { messageText } from "../shared/text.js";
import { CHAT_MODEL } from "./model.provider.js";
import { createTaskTools, type RuntimeContext } from "./task-tools.js";

export interface AgentRunInput {
  /** ต้องมาจากการพิสูจน์ตัวตนแล้ว (ไม่ใช่จากข้อความหรือ model) */
  userId: string;
  /** รหัสบทสนทนาของผู้ใช้ (a-z A-Z 0-9 -) — namespace ด้วย userId ก่อนเป็น thread_id จริง */
  threadId: string;
  message: string;
}

export interface AgentRunResult {
  reply: string;
  toolCalls: { name: string; args: Record<string, unknown> }[];
}

export const THREAD_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

/** thread id จริงที่เก็บใน checkpointer: ผูกกับ userId เสมอ ผู้ใช้อื่นเดา id ก็เข้าไม่ถึง */
export function namespacedThreadId(userId: string, threadId: string): string {
  if (!THREAD_ID_PATTERN.test(threadId)) throw new Error("threadId ไม่ถูกต้อง");
  return `user:${userId}:conv:${threadId}`;
}

const contextSchema = z.object({ userId: z.string() });

@Injectable()
export class AgentService {
  private readonly checkpointer = new MemorySaver();

  constructor(
    @Inject(CHAT_MODEL) private model: BaseChatModel,
    @Inject(TasksService) private readonly tasks: TasksService,
  ) {}

  private build() {
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
    return createAgent({
      model: this.model,
      tools: createTaskTools(this.tasks),
      contextSchema,
      checkpointer: this.checkpointer,
      systemPrompt: `คุณคือผู้ช่วยจัดการงานของผู้ใช้ ตอบเป็นภาษาไทยสั้นกระชับ วันนี้คือ ${today} (เขตเวลา Asia/Bangkok) ใช้ tool เพื่อดู/สร้าง/แก้งานเท่านั้น ห้ามอ้างว่าทำสิ่งที่ไม่ได้เรียก tool และถ้า tool ล้มเหลวให้บอกตามจริง`,
    });
  }

  async run({ userId, threadId, message }: AgentRunInput): Promise<AgentRunResult> {
    const context: RuntimeContext = { userId }; // userId มาจากผู้เรียก (controller ตรวจตัวตนแล้ว) ไม่ใช่จาก model
    const config = { configurable: { thread_id: namespacedThreadId(userId, threadId) }, context, recursionLimit: 15 };
    const result = await retryAsync(() => this.build().invoke({ messages: [{ role: "user", content: message }] }, config));
    return {
      reply: messageText(result.messages.at(-1)!).trim(),
      toolCalls: result.messages.filter(isAIMessage).flatMap((m) => (m.tool_calls ?? []).map((c) => ({ name: c.name, args: c.args as Record<string, unknown> }))),
    };
  }
}
