import { ToolMessage } from "@langchain/core/messages";
import { createMiddleware } from "langchain";
import type { TaskContext } from "../data/tasks.js";

export interface AuditEntry {
  userId: string;
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  at: string;
}

/** audit log ของทุก tool call — userId มาจาก runtime context (ที่ backend ตรวจแล้ว) ไม่ใช่จาก args ของ model */
export function createAuditMiddleware(log: AuditEntry[]) {
  return createMiddleware({
    name: "AuditMiddleware",
    wrapToolCall: async (request, handler) => {
      const ctx = request.runtime.context as Partial<TaskContext> | undefined;
      const entry = (ok: boolean): AuditEntry => ({
        userId: ctx?.userId ?? "unknown",
        tool: request.toolCall.name,
        args: request.toolCall.args,
        ok,
        at: new Date().toISOString(),
      });
      try {
        const result = await handler(request);
        const failed = ToolMessage.isInstance(result) && result.status === "error";
        log.push(entry(!failed));
        return result;
      } catch (error) {
        log.push(entry(false));
        throw error;
      }
    },
  });
}
