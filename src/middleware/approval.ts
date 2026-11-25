import { ToolMessage } from "@langchain/core/messages";
import { createMiddleware, humanInTheLoopMiddleware, type AgentMiddleware } from "langchain";
import type { TaskContext } from "../data/tasks.js";

/** การตัดสินใจของมนุษย์ตอน resume — ตรงกับชนิดของ humanInTheLoopMiddleware */
export type ApprovalDecision =
  | { type: "approve" }
  | { type: "edit"; editedAction: { name: string; args: Record<string, unknown> } }
  | { type: "reject"; message?: string };

export interface ApprovalOptions {
  /** ชื่อ tool ที่ต้องขออนุมัติก่อนรัน (เช่น ["deleteTask"]) */
  requireFor: string[];
  /**
   * ตรวจสิทธิ์ "ตอนรันจริง" อีกครั้ง — การอนุมัติไม่ได้แปลว่าผู้ใช้ยังมีสิทธิ์/ข้อมูลยังเหมือนเดิม
   * (เวลาผ่านไประหว่างรออนุมัติ) คืน false = ปฏิเสธ ไม่รัน tool
   */
  recheck?: (call: { name: string; args: Record<string, unknown> }, context: Partial<TaskContext>) => boolean | Promise<boolean>;
}

/**
 * ชุด middleware สำหรับ human-in-the-loop (ต้องใส่ทั้งชุดตามลำดับ):
 * 1) humanInTheLoopMiddleware — หยุด (interrupt) หลัง model เสนอ tool call ที่ต้องอนุมัติ รอ approve/edit/reject
 * 2) execution guard — ก่อนรัน tool: ปฏิเสธถ้า tool_call_id นี้เคยรันแล้ว (กันรันซ้ำ) และเรียก recheck
 */
export function createApprovalMiddleware(options: ApprovalOptions): AgentMiddleware[] {
  const interruptOn = Object.fromEntries(
    options.requireFor.map((name) => [name, { allowedDecisions: ["approve", "edit", "reject"] as ("approve" | "edit" | "reject")[] }]),
  );
  const executed = new Set<string>();

  const guard = createMiddleware({
    name: "ExecutionGuard",
    wrapToolCall: async (request, handler) => {
      const { name, args, id } = request.toolCall;
      if (!options.requireFor.includes(name)) return handler(request);

      const deny = (reason: string) =>
        new ToolMessage({ content: reason, tool_call_id: id ?? "", name, status: "error" });

      const key = `${(request.runtime as { configurable?: { thread_id?: string } }).configurable?.thread_id ?? ""}:${id}`;
      if (executed.has(key)) return deny("tool call นี้ถูกรันไปแล้ว (กันรันซ้ำ)");

      const context = (request.runtime.context ?? {}) as Partial<TaskContext>;
      if (options.recheck && !(await options.recheck({ name, args }, context))) {
        return deny("ไม่อนุญาต: ตรวจสิทธิ์ซ้ำตอนรันแล้วไม่ผ่าน (สิทธิ์หรือข้อมูลเปลี่ยนไประหว่างรออนุมัติ)");
      }
      executed.add(key);
      return handler(request);
    },
  });

  return [humanInTheLoopMiddleware({ interruptOn }) as unknown as AgentMiddleware, guard as unknown as AgentMiddleware];
}
