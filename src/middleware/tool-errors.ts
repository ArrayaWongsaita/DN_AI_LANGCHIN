import { ToolMessage } from "@langchain/core/messages";
import { createMiddleware } from "langchain";

/** จับ error ที่หลุดจาก tool/middleware ชั้นใน แล้วคืนเป็น ToolMessage (status error) ให้ model เห็นและตอบผู้ใช้ต่อได้ */
export function createToolErrorMiddleware() {
  return createMiddleware({
    name: "ToolErrorMiddleware",
    wrapToolCall: async (request, handler) => {
      try {
        return await handler(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return new ToolMessage({
          content: `tool ${request.toolCall.name} ล้มเหลว: ${message}`,
          tool_call_id: request.toolCall.id ?? "",
          name: request.toolCall.name,
          status: "error",
        });
      }
    },
  });
}
