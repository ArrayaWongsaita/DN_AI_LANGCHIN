import { ToolMessage } from "@langchain/core/messages";
import { createMiddleware, type AgentMiddleware } from "langchain";
import { HttpException } from "@nestjs/common";

/**
 * error ที่เกิดใน tool (validation, ไม่พบงาน, ไม่ใช่เจ้าของ) ต้องกลับไปหา model เป็น ToolMessage(status: error)
 * ไม่ใช่ล้มทั้งคำขอ — model จะเห็นและบอกผู้ใช้ตามจริง. error ที่ไม่รู้จักถูกแทนด้วยข้อความกลาง (ไม่ส่ง stack/ข้อความภายในให้ model)
 */
export function createToolErrorMiddleware(): AgentMiddleware {
  return createMiddleware({
    name: "ToolErrorMiddleware",
    wrapToolCall: async (request, handler) => {
      try {
        return await handler(request);
      } catch (error) {
        const name = request.toolCall.name;
        const message = error instanceof HttpException ? error.message : "เกิดข้อผิดพลาดภายในระบบ";
        return new ToolMessage({ content: `tool ${name} ล้มเหลว: ${message}`, tool_call_id: request.toolCall.id ?? "", name, status: "error" });
      }
    },
  }) as unknown as AgentMiddleware;
}
