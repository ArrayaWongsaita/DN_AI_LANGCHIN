import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { isAIMessage, type BaseMessage } from "@langchain/core/messages";
import { Command, MemorySaver } from "@langchain/langgraph";
import { Inject, Injectable } from "@nestjs/common";
import { createAgent } from "langchain";
import { retryAsync } from "../shared/retry.js";
import { messageText } from "../shared/text.js";
import { TasksService } from "../tasks/tasks.service.js";
import { createApprovalMiddleware, type ApprovalDecision } from "./approval.middleware.js";
import { CHAT_MODEL } from "./model.provider.js";
import { runtimeContextSchema, type RuntimeContext } from "./runtime-context.js";
import { createTaskTools } from "./task-tools.js";
import { assertThreadOwner, threadIdFor } from "./thread-access.js";

export const THREAD_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
/** tool ที่ต้องได้รับอนุมัติจากมนุษย์ก่อนรัน */
export const APPROVAL_TOOLS = ["deleteTask"];

export interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
}
export interface PendingAction extends ToolCallInfo {
  description?: string;
}
export interface AgentRunResult {
  reply: string;
  toolCalls: ToolCallInfo[];
  /** มีค่า = agent หยุดรออนุมัติ (ยังไม่ได้รัน tool เหล่านี้) */
  interrupt?: { actions: PendingAction[] };
}

export type AgentEvent =
  | { type: "token"; text: string }
  | { type: "tool_start"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_end"; id: string; name: string; ok: boolean; content: string }
  | { type: "interrupt"; actions: PendingAction[] }
  | { type: "done"; reply: string };

export interface ChatMessageView {
  role: "human" | "ai" | "tool";
  text: string;
  toolCalls?: ToolCallInfo[];
}

/** thread id จริง = `user:<userId>:conv:<conversationId>` และต้องผ่านการตรวจเจ้าของทุกครั้งก่อนใช้ */
export function ownedThreadId(userId: string, conversationId: string): string {
  if (!THREAD_ID_PATTERN.test(conversationId)) throw new Error("conversationId ไม่ถูกต้อง");
  const id = threadIdFor(userId, conversationId);
  assertThreadOwner(userId, id);
  return id;
}

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
      contextSchema: runtimeContextSchema,
      checkpointer: this.checkpointer,
      middleware: createApprovalMiddleware({
        requireFor: APPROVAL_TOOLS,
        // ตรวจซ้ำตอนรันจริง: งานต้องยังมีอยู่และเป็นของผู้ใช้ใน context (ไม่ใช่ที่ model อ้าง)
        recheck: async ({ args }, context) => {
          if (!context.userId || typeof args.id !== "string") return false;
          return this.tasks.get(context.userId, args.id).then(() => true, () => false);
        },
      }),
      systemPrompt: `คุณคือผู้ช่วยจัดการงานของผู้ใช้ ตอบเป็นภาษาไทยสั้นกระชับ วันนี้คือ ${today} (เขตเวลา Asia/Bangkok) ใช้ tool เพื่อดู/สร้าง/แก้/ลบงานเท่านั้น ห้ามอ้างว่าทำสิ่งที่ไม่ได้เรียก tool เมื่อผู้ใช้สั่งลบให้เรียก deleteTask ทันที (ถ้ายังไม่รู้ id ให้เรียก getTasks ก่อน) ระบบจะขออนุมัติจากผู้ใช้เองจึงไม่ต้องถามยืนยันในแชท และถ้า tool ล้มเหลวให้บอกตามจริง`,
    });
  }

  private config(ctx: RuntimeContext, conversationId: string, signal?: AbortSignal) {
    return { configurable: { thread_id: ownedThreadId(ctx.userId, conversationId) }, context: ctx, recursionLimit: 25, signal };
  }

  private toResult(result: { messages: BaseMessage[]; __interrupt__?: { value?: { actionRequests?: PendingAction[] } }[] }): AgentRunResult {
    const actions = result.__interrupt__?.[0]?.value?.actionRequests;
    const lastHuman = result.messages.map((m) => m.getType()).lastIndexOf("human");
    const turn = result.messages.slice(lastHuman + 1); // เฉพาะรอบนี้ ไม่รวมประวัติของ thread
    return {
      reply: actions ? "" : messageText(result.messages.at(-1)!).trim(),
      toolCalls: turn.filter(isAIMessage).flatMap((m) => (m.tool_calls ?? []).map((c) => ({ name: c.name, args: c.args as Record<string, unknown> }))),
      ...(actions ? { interrupt: { actions: actions.map((a) => ({ name: a.name, args: a.args, description: a.description })) } } : {}),
    };
  }

  async run(input: { ctx: RuntimeContext; conversationId: string; message: string }): Promise<AgentRunResult> {
    const config = this.config(input.ctx, input.conversationId);
    const result = await retryAsync(() => this.build().invoke({ messages: [{ role: "user", content: input.message }] }, config));
    return this.toResult(result as never);
  }

  /** ต่อจากจุดที่หยุดรออนุมัติ — `decisions` เรียงตาม actions ที่ถูกขอ */
  async resume(input: { ctx: RuntimeContext; conversationId: string; decisions: ApprovalDecision[] }): Promise<AgentRunResult> {
    const config = this.config(input.ctx, input.conversationId);
    const result = await retryAsync(() => this.build().invoke(new Command({ resume: { decisions: input.decisions } }), config));
    return this.toResult(result as never);
  }

  /**
   * สตรีมเหตุการณ์ของ agent: token → tool_start → tool_end → … → done (หรือ interrupt เมื่อต้องรออนุมัติ)
   * ส่ง `signal` เพื่อยกเลิก: เมื่อ abort จะหยุดเรียก model/tool ต่อ
   */
  async *stream(input: { ctx: RuntimeContext; conversationId: string; message: string; signal?: AbortSignal }): AsyncGenerator<AgentEvent> {
    const config = { ...this.config(input.ctx, input.conversationId, input.signal), streamMode: ["messages", "updates"] as ("messages" | "updates")[] };
    const iter = (await this.build().stream({ messages: [{ role: "user", content: input.message }] }, config)) as unknown as AsyncIterable<[string, unknown]>;
    let streamedThisStep = "";
    let reply = "";
    for await (const [mode, data] of iter) {
      if (input.signal?.aborted) return;
      if (mode === "messages") {
        const [chunk, meta] = data as [BaseMessage, { langgraph_node?: string }];
        if (chunk.getType() !== "ai" || meta.langgraph_node !== "model_request") continue;
        const text = messageText(chunk);
        if (text) {
          streamedThisStep += text;
          yield { type: "token", text };
        }
        continue;
      }
      for (const [node, update] of Object.entries(data as Record<string, unknown>)) {
        if (node === "__interrupt__") {
          const actions = (update as { value?: { actionRequests?: PendingAction[] } }[])[0]?.value?.actionRequests ?? [];
          yield { type: "interrupt", actions: actions.map((a) => ({ name: a.name, args: a.args, description: a.description })) };
          return;
        }
        const messages = ((update as { messages?: BaseMessage[] } | null)?.messages ?? []) as BaseMessage[];
        for (const m of messages) {
          if (isAIMessage(m)) {
            const text = messageText(m);
            if (text && !streamedThisStep) yield { type: "token", text }; // provider ที่ไม่สตรีม: ส่งทั้งก้อนเป็น token เดียว
            streamedThisStep = "";
            if (!m.tool_calls?.length) reply = text.trim();
            for (const c of m.tool_calls ?? []) yield { type: "tool_start", id: c.id ?? "", name: c.name, args: c.args as Record<string, unknown> };
          } else if (m.getType() === "tool") {
            const t = m as BaseMessage & { tool_call_id: string; name?: string; status?: string };
            yield { type: "tool_end", id: t.tool_call_id, name: t.name ?? "", ok: t.status !== "error", content: messageText(m) };
          }
        }
      }
    }
    yield { type: "done", reply };
  }

  /** ประวัติบทสนทนาจาก checkpointer (ผู้เรียกต้องตรวจเจ้าของ conversation ก่อน) */
  async messages(userId: string, conversationId: string): Promise<ChatMessageView[]> {
    const graph = this.build() as unknown as { getState(c: unknown): Promise<{ values: { messages?: BaseMessage[] } }> };
    const state = await graph.getState({ configurable: { thread_id: ownedThreadId(userId, conversationId) } });
    const messages = state.values.messages ?? [];
    return messages.map((m) => ({
      role: m.getType() === "human" ? "human" : m.getType() === "tool" ? "tool" : "ai",
      text: messageText(m),
      ...(isAIMessage(m) && m.tool_calls?.length ? { toolCalls: m.tool_calls.map((c) => ({ name: c.name, args: c.args as Record<string, unknown> })) } : {}),
    }));
  }

  async deleteThread(userId: string, conversationId: string): Promise<void> {
    await this.checkpointer.deleteThread(ownedThreadId(userId, conversationId));
  }
}
