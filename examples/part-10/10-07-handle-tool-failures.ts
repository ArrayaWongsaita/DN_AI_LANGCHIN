// 10-07: Handle Tool Failures
// แนวคิด: tool พังไม่ควรทำให้ agent ล้ม — ส่ง error กลับเป็น ToolMessage ให้โมเดลปรับตัว (ลองใหม่ / อธิบายผู้ใช้)
// ใช้ scripted model: ขอ tool ที่ไม่มี → ขอ tool ด้วย args ผิด → ตอบสรุป (ทำซ้ำได้แน่นอน)
import { AIMessage, HumanMessage, type ToolMessage } from "@langchain/core/messages";
import { runAgentLoop } from "../../src/agents/agent-loop.js";
import { workshopTools } from "../../src/tools/index.js";
import { createScriptedChatModel } from "../../src/utils/scripted-model.js";

const model = createScriptedChatModel([
  new AIMessage({ content: "", tool_calls: [{ name: "teleport", args: { to: "mars" }, id: "c1", type: "tool_call" }] }),
  new AIMessage({ content: "", tool_calls: [{ name: "add", args: { a: "หนึ่ง", b: 2 }, id: "c2", type: "tool_call" }] }),
  new AIMessage("ขออภัย ใช้เครื่องมือไม่สำเร็จ จึงไม่สามารถคำนวณให้ได้"),
]);

const r = await runAgentLoop({ model, tools: workshopTools, messages: [new HumanMessage("ช่วยคำนวณให้หน่อย")] });
for (const m of r.messages.filter((m) => m.getType() === "tool") as ToolMessage[]) {
  console.log(`[${m.tool_call_id}] status=${m.status}: ${String(m.content).slice(0, 80)}`);
}
console.log(`จบด้วย ${r.stopReason} หลัง ${r.iterations} รอบ: ${r.finalText}`);
