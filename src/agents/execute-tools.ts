import type { AIMessage } from "@langchain/core/messages";
import { ToolMessage } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";

function toText(result: unknown): string {
  return typeof result === "string" ? result : JSON.stringify(result);
}

/**
 * รันทุก tool call ใน AIMessage แล้วคืน ToolMessage หนึ่งอันต่อหนึ่ง call (เรียงตามเดิม, tool_call_id ตรงกัน)
 * tool ไม่พบ / args ไม่ผ่าน schema / tool โยน error → ได้ ToolMessage แบบ status "error" ไม่ throw
 * (ให้โมเดลเห็น error แล้วตัดสินใจเองว่าจะลองใหม่หรืออธิบายผู้ใช้)
 */
export async function executeToolCalls(tools: StructuredToolInterface[], ai: AIMessage): Promise<ToolMessage[]> {
  const byName = new Map(tools.map((t) => [t.name, t]));
  return Promise.all(
    (ai.tool_calls ?? []).map(async (call): Promise<ToolMessage> => {
      const id = call.id ?? `missing-id-${call.name}`;
      const t = byName.get(call.name);
      if (!t) {
        return new ToolMessage({ content: `Error: ไม่พบ tool ชื่อ "${call.name}" (มี: ${[...byName.keys()].join(", ")})`, tool_call_id: id, name: call.name, status: "error" });
      }
      try {
        const result = await t.invoke(call.args);
        return new ToolMessage({ content: toText(result), tool_call_id: id, name: call.name, status: "success" });
      } catch (err) {
        return new ToolMessage({ content: `Error: ${(err as Error).message}`, tool_call_id: id, name: call.name, status: "error" });
      }
    }),
  );
}
