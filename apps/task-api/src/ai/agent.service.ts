import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { isAIMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { Command, MemorySaver } from "@langchain/langgraph";
import { Inject, Injectable } from "@nestjs/common";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { BaseStore } from "@langchain/langgraph-checkpoint";
import { createAgent, modelCallLimitMiddleware, modelFallbackMiddleware, modelRetryMiddleware, summarizationMiddleware, toolCallLimitMiddleware, type AgentMiddleware } from "langchain";
import { MCP_TOOLS, type McpToolsFactory } from "../mcp/mcp-tools.js";
import { isTransientModelError } from "../shared/retry.js";
import { messageText } from "../shared/text.js";
import { KnowledgeService } from "../knowledge/knowledge.service.js";
import { TasksService } from "../tasks/tasks.service.js";
import { createToolErrorMiddleware } from "./tool-errors.middleware.js";
import { createApprovalMiddleware, type ApprovalDecision } from "./approval.middleware.js";
import { CHAT_MODEL, FALLBACK_MODEL } from "./model.provider.js";
import { createDynamicPromptMiddleware } from "./dynamic-prompt.middleware.js";
import { createLoggingMiddleware, type LogEvent } from "./logging.middleware.js";
import { STORE } from "./preferences.js";
import { createUntrustedResultMiddleware } from "./untrusted.middleware.js";
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
export interface Usage {
  inputTokens: number;
  outputTokens: number;
}
export interface AgentRunResult {
  reply: string;
  usage: Usage;
  toolCalls: ToolCallInfo[];
  /** มีค่า = agent หยุดรออนุมัติ (ยังไม่ได้รัน tool เหล่านี้) */
  interrupt?: { actions: PendingAction[] };
}

export type AgentEvent =
  | { type: "token"; text: string }
  | { type: "tool_start"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_end"; id: string; name: string; ok: boolean; content: string }
  | { type: "interrupt"; actions: PendingAction[] }
  | { type: "done"; reply: string; usage: Usage };

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

function sumUsage(messages: BaseMessage[]): Usage {
  let inputTokens = 0;
  let outputTokens = 0;
  for (const m of messages) {
    if (!isAIMessage(m)) continue;
    inputTokens += m.usage_metadata?.input_tokens ?? 0;
    outputTokens += m.usage_metadata?.output_tokens ?? 0;
  }
  return { inputTokens, outputTokens };
}

@Injectable()
export class AgentService {
  private readonly checkpointer = new MemorySaver();

  constructor(
    @Inject(CHAT_MODEL) private model: BaseChatModel,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(KnowledgeService) private readonly knowledge: KnowledgeService,
    @Inject(MCP_TOOLS) private readonly mcp: McpToolsFactory | null,
    @Inject(STORE) private readonly store: BaseStore,
    @Inject(FALLBACK_MODEL) private fallbackModel: BaseChatModel | null,
  ) {}

  /** ตัวเลือกของ modelRetryMiddleware (เทสต์ตั้ง delay ให้สั้นได้) */
  retryOptions: { maxRetries?: number; delayMs?: number } = {};
  /** เพดานการทำงานต่อหนึ่งคำขอ (กัน loop/ค่าใช้จ่ายพุ่ง) */
  limits?: { modelCalls: number; toolCalls: number };
  /** เมื่อประวัติยาวถึง `trigger` ข้อความ ให้สรุปของเก่าเป็นข้อความเดียวและเก็บ `keep` ข้อความล่าสุด */
  summarize?: { trigger: number; keep: number };
  /** ตัวรับ log ของ agent (ค่าเริ่มต้น: เงียบ; ตั้ง AGENT_LOG=true เพื่อพิมพ์) */
  logSink?: (e: LogEvent) => void;

  /** โหลด MCP tools ของผู้ใช้ (ถ้าเปิดไว้) รัน fn แล้วปิดการเชื่อมต่อเสมอ */
  private async withAgent<T>(ctx: RuntimeContext, fn: (agent: ReturnType<AgentService["build"]>) => Promise<T>): Promise<T> {
    const toolset = this.mcp ? await this.mcp(ctx.userId) : null;
    try {
      return await fn(this.build(toolset?.tools ?? []));
    } finally {
      await toolset?.close().catch(() => undefined);
    }
  }

  private middleware(extraTools: StructuredToolInterface[]): AgentMiddleware[] {
    const limits = this.limits ?? { modelCalls: 12, toolCalls: 10 };
    const sum = this.summarize ?? { trigger: 40, keep: 12 };
    const sink = this.logSink ?? (process.env.AGENT_LOG === "true" ? (e: LogEvent) => console.log("[agent]", JSON.stringify(e)) : () => undefined);
    // กลุ่มที่ห่อ model/tool จากนอกสุดเข้าใน: error → log → ข้อมูลภายนอก → prompt → fallback → retry → เพดาน → สรุปประวัติ → อนุมัติ
    return [
      createToolErrorMiddleware(),
      createLoggingMiddleware(sink) as unknown as AgentMiddleware,
      createUntrustedResultMiddleware((n) => n === "searchKnowledge" || extraTools.some((t) => t.name === n)),
      createDynamicPromptMiddleware(),
      ...(this.fallbackModel ? [modelFallbackMiddleware(this.fallbackModel) as unknown as AgentMiddleware] : []), // อยู่นอก retry: ลองโมเดลหลักครบก่อนค่อยสลับ
      modelRetryMiddleware({ maxRetries: this.retryOptions.maxRetries ?? 2, initialDelayMs: this.retryOptions.delayMs ?? 500, backoffFactor: 2, retryOn: (e: Error) => isTransientModelError(e), onFailure: "error" }) as unknown as AgentMiddleware,
      modelCallLimitMiddleware({ runLimit: limits.modelCalls, exitBehavior: "end" }) as unknown as AgentMiddleware,
      toolCallLimitMiddleware({ runLimit: limits.toolCalls, exitBehavior: "continue" }) as unknown as AgentMiddleware,
      summarizationMiddleware({ model: this.model, trigger: { messages: sum.trigger }, keep: { messages: sum.keep } }) as unknown as AgentMiddleware,
      ...createApprovalMiddleware({
        requireFor: APPROVAL_TOOLS,
        // ตรวจซ้ำตอนรันจริง: งานต้องยังมีอยู่และเป็นของผู้ใช้ใน context (ไม่ใช่ที่ model อ้าง)
        recheck: async ({ args }, context) => {
          if (!context.userId || typeof args.id !== "string") return false;
          return this.tasks.get(context.userId, args.id).then(() => true, () => false);
        },
      }),
    ];
  }

  private build(extraTools: StructuredToolInterface[] = []) {
    return createAgent({
      model: this.model,
      tools: [...createTaskTools(this.tasks, this.knowledge), ...extraTools],
      contextSchema: runtimeContextSchema,
      checkpointer: this.checkpointer,
      store: this.store,
      middleware: this.middleware(extraTools),
    });
  }

  private config(ctx: RuntimeContext, conversationId: string, signal?: AbortSignal) {
    return { configurable: { thread_id: ownedThreadId(ctx.userId, conversationId) }, context: ctx, recursionLimit: 150, signal };
  }

  private toResult(result: { messages: BaseMessage[]; __interrupt__?: { value?: { actionRequests?: PendingAction[] } }[] }): AgentRunResult {
    const actions = result.__interrupt__?.[0]?.value?.actionRequests;
    const lastHuman = result.messages.map((m) => m.getType()).lastIndexOf("human");
    const turn = result.messages.slice(lastHuman + 1); // เฉพาะรอบนี้ ไม่รวมประวัติของ thread
    return {
      reply: actions ? "" : messageText(result.messages.at(-1)!).trim(),
      usage: sumUsage(turn),
      toolCalls: turn.filter(isAIMessage).flatMap((m) => (m.tool_calls ?? []).map((c) => ({ name: c.name, args: c.args as Record<string, unknown> }))),
      ...(actions ? { interrupt: { actions: actions.map((a) => ({ name: a.name, args: a.args, description: a.description })) } } : {}),
    };
  }

  async run(input: { ctx: RuntimeContext; conversationId: string; message: string }): Promise<AgentRunResult> {
    const config = this.config(input.ctx, input.conversationId);
    const result = await this.withAgent(input.ctx, (agent) =>
      agent.invoke({ messages: [{ role: "user", content: input.message }] }, config),
    );
    return this.toResult(result as never);
  }

  /** ต่อจากจุดที่หยุดรออนุมัติ — `decisions` เรียงตาม actions ที่ถูกขอ */
  async resume(input: { ctx: RuntimeContext; conversationId: string; decisions: ApprovalDecision[] }): Promise<AgentRunResult> {
    const config = this.config(input.ctx, input.conversationId);
    const result = await this.withAgent(input.ctx, (agent) =>
      agent.invoke(new Command({ resume: { decisions: input.decisions } }), config),
    );
    return this.toResult(result as never);
  }

  /**
   * สตรีมเหตุการณ์ของ agent: token → tool_start → tool_end → … → done (หรือ interrupt เมื่อต้องรออนุมัติ)
   * ส่ง `signal` เพื่อยกเลิก: เมื่อ abort จะหยุดเรียก model/tool ต่อ
   */
  async *stream(input: { ctx: RuntimeContext; conversationId: string; message: string; signal?: AbortSignal }): AsyncGenerator<AgentEvent> {
    const config = { ...this.config(input.ctx, input.conversationId, input.signal), streamMode: ["messages", "updates"] as ("messages" | "updates")[] };
    const toolset = this.mcp ? await this.mcp(input.ctx.userId) : null;
    try {
    const iter = (await this.build(toolset?.tools ?? []).stream({ messages: [{ role: "user", content: input.message }] }, config)) as unknown as AsyncIterable<[string, unknown]>;
    let streamedThisStep = "";
    let reply = "";
    const turnMessages: BaseMessage[] = [];
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
        if (node !== "model_request" && node !== "tools") continue; // node ของ middleware ก็ส่ง update ซ้ำ — นับเฉพาะ model/tool จริง
        const messages = ((update as { messages?: BaseMessage[] } | null)?.messages ?? []) as BaseMessage[];
        for (const m of messages) {
          if (isAIMessage(m)) {
            turnMessages.push(m);
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
    yield { type: "done", reply, usage: sumUsage(turnMessages) };
    } finally {
      await toolset?.close().catch(() => undefined);
    }
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

  /**
   * สถานะ thread ที่ตรวจเจ้าของแล้ว: `interrupt` = หยุดรออนุมัติอยู่, `dangling` = tool call ที่ยังไม่มีผลลัพธ์ (เช่นลูกค้าตัดสาย/ชนเพดานกลางทาง),
   * `empty` = ไม่มีข้อความเลย (checkpoint หาย เช่นรีสตาร์ท)
   */
  async threadStatus(userId: string, conversationId: string): Promise<{ interrupt: PendingAction[] | null; dangling: { id: string; name: string }[]; empty: boolean }> {
    const graph = this.build() as unknown as { getState(c: unknown): Promise<{ values: { messages?: BaseMessage[] }; tasks?: { interrupts?: { value?: { actionRequests?: PendingAction[] } }[] }[] }> };
    const state = await graph.getState({ configurable: { thread_id: ownedThreadId(userId, conversationId) } });
    const messages = state.values.messages ?? [];
    const answered = new Set(messages.filter((m) => m.getType() === "tool").map((m) => (m as BaseMessage & { tool_call_id: string }).tool_call_id));
    const actions = state.tasks?.flatMap((t) => t.interrupts ?? []).find((i) => i.value?.actionRequests)?.value?.actionRequests;
    return {
      interrupt: actions ? actions.map((a) => ({ name: a.name, args: a.args, description: a.description })) : null,
      dangling: messages.flatMap((m) => (isAIMessage(m) ? (m.tool_calls ?? []) : [])).filter((c) => c.id && !answered.has(c.id)).map((c) => ({ id: c.id!, name: c.name })),
      empty: messages.length === 0,
    };
  }

  /** ปิด tool call ที่ค้าง (ไม่มีผลลัพธ์) ด้วย ToolMessage ที่บอกว่าถูกยกเลิก เพื่อให้ส่งข้อความต่อได้ — provider จริงปฏิเสธลำดับที่ขาด */
  async cancelDangling(userId: string, conversationId: string, dangling: { id: string; name: string }[]): Promise<void> {
    if (dangling.length === 0) return;
    const graph = this.build() as unknown as { updateState(c: unknown, v: unknown): Promise<unknown> };
    await graph.updateState(
      { configurable: { thread_id: ownedThreadId(userId, conversationId) } },
      { messages: dangling.map((d) => new ToolMessage({ tool_call_id: d.id, name: d.name, status: "error", content: "การทำงานนี้ถูกยกเลิกก่อนเสร็จ (การเชื่อมต่อขาดหรือชนเพดาน) ไม่ได้ทำรายการ" })) },
    );
  }

  async deleteThread(userId: string, conversationId: string): Promise<void> {
    await this.checkpointer.deleteThread(ownedThreadId(userId, conversationId));
  }
}
