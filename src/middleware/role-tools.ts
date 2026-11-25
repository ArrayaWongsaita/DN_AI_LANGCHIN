import { ToolMessage } from "@langchain/core/messages";
import { createMiddleware } from "langchain";
import { TOOL_KINDS, type Role, type TaskContext, type ToolKind } from "../data/tasks.js";

export const ROLE_PERMISSIONS: Record<Role, ToolKind[]> = {
  viewer: ["read"],
  editor: ["read", "write"],
  admin: ["read", "write", "destructive"],
};

function allowed(role: Role | undefined, toolName: string): boolean {
  const kind = TOOL_KINDS[toolName];
  return !!role && !!kind && ROLE_PERMISSIONS[role].includes(kind);
}

/**
 * เลือก tool ตาม role ที่ได้จาก runtime context
 * - wrapModelCall: ซ่อน tool ที่ role นี้ใช้ไม่ได้ (model จะไม่เห็นมัน)
 * - wrapToolCall: ถ้า model เรียก tool ที่ไม่ได้รับอนุญาตอยู่ดี ให้ปฏิเสธตอนรัน (defense in depth)
 * หมายเหตุ: นี่ไม่ใช่สิ่งทดแทน authorization ฝั่ง backend
 */
export function createRoleBasedToolMiddleware() {
  return createMiddleware({
    name: "RoleBasedToolMiddleware",
    wrapModelCall: (request, handler) => {
      const role = (request.runtime.context as Partial<TaskContext> | undefined)?.role;
      return handler({ ...request, tools: request.tools.filter((t) => allowed(role, (t as { name: string }).name)) });
    },
    wrapToolCall: (request, handler) => {
      const role = (request.runtime.context as Partial<TaskContext> | undefined)?.role;
      if (!allowed(role, request.toolCall.name)) {
        return new ToolMessage({
          content: `ไม่อนุญาต: role "${role ?? "unknown"}" ใช้ tool ${request.toolCall.name} ไม่ได้`,
          tool_call_id: request.toolCall.id ?? "",
          name: request.toolCall.name,
          status: "error",
        });
      }
      return handler(request);
    },
  });
}
