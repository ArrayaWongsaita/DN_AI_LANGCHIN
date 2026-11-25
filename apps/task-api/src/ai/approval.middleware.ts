import { ToolMessage } from "@langchain/core/messages";
import { createMiddleware, humanInTheLoopMiddleware, type AgentMiddleware } from "langchain";
import type { RuntimeContext } from "./runtime-context.js";

export type ApprovalDecision =
  | { type: "approve" }
  | { type: "edit"; editedAction: { name: string; args: Record<string, unknown> } }
  | { type: "reject"; message?: string };

export interface ApprovalOptions {
  requireFor: string[];
  /** ตรวจซ้ำ "ตอนรันจริง" (หลังอนุมัติ) — คืน false = ไม่รัน tool */
  recheck: (call: { name: string; args: Record<string, unknown> }, context: Partial<RuntimeContext>) => boolean | Promise<boolean>;
}

/** HITL + execution guard (ปรับจาก Part 17): หยุดรออนุมัติ → ตรวจสิทธิ์/ข้อมูลซ้ำตอนรัน → กันรัน tool_call_id เดิมซ้ำ */
export function createApprovalMiddleware(options: ApprovalOptions): AgentMiddleware[] {
  const interruptOn = Object.fromEntries(options.requireFor.map((n) => [n, { allowedDecisions: ["approve", "edit", "reject"] as ("approve" | "edit" | "reject")[] }]));
  const executed = new Set<string>();
  const guard = createMiddleware({
    name: "ExecutionGuard",
    wrapToolCall: async (request, handler) => {
      const { name, args, id } = request.toolCall;
      if (!options.requireFor.includes(name)) return handler(request);
      const deny = (m: string) => new ToolMessage({ content: m, tool_call_id: id ?? "", name, status: "error" });
      const key = `${(request.runtime as { configurable?: { thread_id?: string } }).configurable?.thread_id ?? ""}:${id}`;
      if (executed.has(key)) return deny("tool call นี้ถูกรันไปแล้ว");
      if (!(await options.recheck({ name, args }, (request.runtime.context ?? {}) as Partial<RuntimeContext>))) {
        return deny("ไม่อนุญาต: ตรวจซ้ำตอนรันแล้วไม่ผ่าน (งานไม่มีอยู่หรือไม่ใช่ของผู้ใช้)");
      }
      executed.add(key);
      return handler(request);
    },
  });
  return [humanInTheLoopMiddleware({ interruptOn }) as unknown as AgentMiddleware, guard as unknown as AgentMiddleware];
}
