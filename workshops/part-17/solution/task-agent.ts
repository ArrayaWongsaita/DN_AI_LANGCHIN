import { parseArgs } from "node:util";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { MemorySaver, Command } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { createAgent, toolCallLimitMiddleware } from "langchain";
import { z } from "zod";
import { TaskStore, createTaskTools, type TaskContext } from "../../../src/data/tasks.js";
import {
  createApprovalMiddleware,
  createAuditMiddleware,
  createDynamicPromptMiddleware,
  createRoleBasedToolMiddleware,
  createToolErrorMiddleware,
  type ApprovalDecision,
  type AuditEntry,
} from "../../../src/middleware/index.js";
import { createChatModel } from "../../../src/models/index.js";
import { isMain } from "../../../src/utils/is-main.js";
import { retryAsync } from "../../../src/utils/retry.js";
import { messageText } from "../../../src/utils/text.js";

export const TOOL_CALL_LIMIT = 6;

const contextSchema = z.object({ userId: z.string(), role: z.enum(["viewer", "editor", "admin"]), name: z.string(), language: z.enum(["th", "en"]).optional() });

export interface TaskAgentOptions {
  model: BaseChatModel;
  store: TaskStore;
  audit: AuditEntry[];
  checkpointer: BaseCheckpointSaver;
}

/**
 * Agent จัดการงาน: อ่านได้ทันที · เพิ่ม/แก้ตาม role · ลบต้อง admin + มนุษย์อนุมัติ · บันทึก audit · จำกัด tool call 6 ครั้งต่อ run
 * ลำดับ middleware สำคัญ: ตัวแรกอยู่ชั้นนอกสุด
 */
export function createTaskAgent({ model, store, audit, checkpointer }: TaskAgentOptions) {
  return createAgent({
    model,
    tools: createTaskTools(store),
    contextSchema,
    checkpointer,
    middleware: [
      createToolErrorMiddleware(), // จับ error ของชั้นใน → ToolMessage
      createAuditMiddleware(audit), // เห็นทั้งที่สำเร็จและที่ถูกปฏิเสธ
      createDynamicPromptMiddleware("คุณคือผู้ช่วยจัดการงาน ตอบสั้นกระชับ ถ้า tool ปฏิเสธ ให้บอกผู้ใช้ตามตรง"),
      createRoleBasedToolMiddleware(),
      ...createApprovalMiddleware({
        requireFor: ["deleteTask"],
        // ตรวจซ้ำตอนรันจริง: ยังเป็น admin และงานนั้นยังเป็นของผู้ใช้อยู่
        recheck: (call, context) => context.role === "admin" && store.get(context.userId ?? "", String(call.args.id)) !== undefined,
      }),
      toolCallLimitMiddleware({ runLimit: TOOL_CALL_LIMIT, exitBehavior: "end" }),
    ],
  });
}

export interface TurnInput {
  context: TaskContext;
  threadId: string;
  /** ข้อความใหม่ — หรือ decision เพื่อ resume ที่หยุดรออนุมัติอยู่ */
  message?: string;
  decision?: ApprovalDecision;
}

export interface TurnResult {
  reply: string;
  interrupted: boolean;
  request?: { name: string; args: Record<string, unknown>; description?: string }[];
}

export async function runTurn(agent: ReturnType<typeof createTaskAgent>, input: TurnInput): Promise<TurnResult> {
  const config = { configurable: { thread_id: input.threadId }, context: input.context, recursionLimit: 50 }; // เพดานจริงคือ toolCallLimit (6) — recursionLimit แค่กันตกรอบสุดท้าย (middleware หลายตัวนับ step เยอะ)
  const payload = input.decision
    ? new Command({ resume: { decisions: [input.decision] } })
    : { messages: [{ role: "user" as const, content: input.message ?? "" }] };
  const r = await agent.invoke(payload as never, config);
  const interrupt = (r as { __interrupt__?: { value: { actionRequests: TurnResult["request"] } }[] }).__interrupt__?.[0];
  if (interrupt) return { reply: "", interrupted: true, request: interrupt.value.actionRequests };
  return { reply: messageText(r.messages.at(-1)!).trim(), interrupted: false };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { role: { type: "string", default: "viewer" }, decision: { type: "string", default: "reject" } },
  });
  const role = values.role as TaskContext["role"];
  if (!["viewer", "editor", "admin"].includes(role)) throw new Error("--role ต้องเป็น viewer | editor | admin");
  const message = positionals.join(" ").trim();
  if (!message) throw new Error('ใช้: tsx task-agent.ts --role admin [--decision approve|reject] "ลบงาน t2"');

  const store = new TaskStore();
  const audit: AuditEntry[] = [];
  const agent = createTaskAgent({ model: await createChatModel({ maxTokens: 1500 }), store, audit, checkpointer: new MemorySaver() });
  const context: TaskContext = { userId: "u1", role, name: "สมชาย" };
  const threadId = `cli-${Date.now()}`;

  let turn = await retryAsync(() => runTurn(agent, { context, threadId, message }));
  if (turn.interrupted) {
    console.log("⏸  รออนุมัติ:", JSON.stringify(turn.request));
    const decision: ApprovalDecision = values.decision === "approve" ? { type: "approve" } : { type: "reject", message: "ผู้ใช้ไม่อนุมัติ" };
    console.log("👤 ตัดสินใจ:", decision.type);
    turn = await retryAsync(() => runTurn(agent, { context, threadId, decision }));
  }
  console.log("ตอบ:", turn.reply);
  console.log("\nAudit log:");
  for (const e of audit) console.log(`  ${e.at.slice(11, 19)} ${e.userId} ${e.tool}(${JSON.stringify(e.args)}) ok=${e.ok}`);
  console.log(`\nงานของ u1 ที่เหลือ: ${store.list("u1").map((t) => t.id).join(", ")}`);
}

if (isMain(import.meta.url)) {
  main().catch((e) => {
    console.error("❌", e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
