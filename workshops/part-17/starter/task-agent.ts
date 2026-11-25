// Workshop 17 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { createAgent } from "langchain";
import { z } from "zod";
import { TaskStore, createTaskTools, type TaskContext } from "../../../src/data/tasks.js";
import {
  createApprovalMiddleware, createAuditMiddleware, createDynamicPromptMiddleware, createRoleBasedToolMiddleware, createToolErrorMiddleware,
  type ApprovalDecision, type AuditEntry,
} from "../../../src/middleware/index.js";

export const TOOL_CALL_LIMIT = 6;
const contextSchema = z.object({ userId: z.string(), role: z.enum(["viewer", "editor", "admin"]), name: z.string(), language: z.enum(["th", "en"]).optional() });

export interface TaskAgentOptions { model: BaseChatModel; store: TaskStore; audit: AuditEntry[]; checkpointer: BaseCheckpointSaver }

/**
 * โจทย์: อ่านได้ทันที · เพิ่ม/แก้ตาม role · ลบต้อง admin + มนุษย์อนุมัติ · บันทึก audit · จำกัด tool call 6 ครั้งต่อ run
 * ลำดับ middleware สำคัญ — ตัวแรกอยู่ชั้นนอกสุด (ดู Part 17 หัวข้อ 3)
 */
export function createTaskAgent({ model, store, audit, checkpointer }: TaskAgentOptions) {
  // TODO: ใส่ middleware ให้ครบ: toolError → audit → dynamicPrompt → roleBasedTool → toolCallLimit → approval
  void [createApprovalMiddleware, createAuditMiddleware, createDynamicPromptMiddleware, createRoleBasedToolMiddleware, createToolErrorMiddleware, audit];
  return createAgent({ model, tools: createTaskTools(store), contextSchema, checkpointer });
}

export interface TurnInput { context: TaskContext; threadId: string; message?: string; decision?: ApprovalDecision }
export interface TurnResult { reply: string; interrupted: boolean; request?: { name: string; args: Record<string, unknown>; description?: string }[] }

/** รัน 1 เทิร์น หรือ resume ด้วย decision (Command({ resume: { decisions: [decision] } })) */
export async function runTurn(agent: ReturnType<typeof createTaskAgent>, input: TurnInput): Promise<TurnResult> {
  void [agent, input];
  throw new Error("TODO: ยังไม่ได้ทำ");
}
