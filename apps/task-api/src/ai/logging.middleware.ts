import { createMiddleware } from "langchain";

export interface LogEvent {
  phase: "before_model" | "after_model" | "tool";
  name: string;
  ms?: number;
  tokens?: number;
}

/** บันทึกทุกรอบของ agent: ก่อน/หลังเรียก model และทุกครั้งที่เรียก tool (วัดเวลา) — เรื่อง cross-cutting ที่ไม่ควรปนในตัว tool */
export function createLoggingMiddleware(sink: (event: LogEvent) => void) {
  return createMiddleware({
    name: "LoggingMiddleware",
    beforeModel: () => {
      sink({ phase: "before_model", name: "model" });
    },
    afterModel: (state) => {
      const last = state.messages.at(-1) as { usage_metadata?: { total_tokens?: number } } | undefined;
      sink({ phase: "after_model", name: "model", tokens: last?.usage_metadata?.total_tokens });
    },
    wrapToolCall: async (request, handler) => {
      const start = Date.now();
      try {
        return await handler(request);
      } finally {
        sink({ phase: "tool", name: request.toolCall.name, ms: Date.now() - start });
      }
    },
  });
}
