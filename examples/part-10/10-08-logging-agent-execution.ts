// 10-08: Logging Agent Execution
// แนวคิด: agent ที่ไม่มี log ดีบั๊กไม่ได้ — onStep ให้ hook ดูทุกขั้น (โมเดลขออะไร / tool ตอบอะไร / ใช้กี่รอบ)
import { HumanMessage } from "@langchain/core/messages";
import { runAgentLoop } from "../../src/agents/agent-loop.js";
import { createChatModel } from "../../src/models/index.js";
import { workshopTools } from "../../src/tools/index.js";

const started = performance.now();
const model = await createChatModel({ maxTokens: 2000 });
const r = await runAgentLoop({
  model,
  tools: workshopTools,
  messages: [new HumanMessage("ใช้เครื่องมือ: ค้นหา keyboard แล้วบอกราคาคูณ 2")],
  onStep: ({ type, iteration, message }) => {
    const ms = Math.round(performance.now() - started);
    if (type === "model") {
      const calls = (message as { tool_calls?: { name: string }[] }).tool_calls ?? [];
      console.log(`[+${ms}ms] รอบ ${iteration} โมเดล → ${calls.length ? "ขอ " + calls.map((c) => c.name).join(", ") : "ตอบสุดท้าย"}`);
    } else {
      console.log(`[+${ms}ms] รอบ ${iteration} tool   → ${String(message.content).slice(0, 60).replace(/\n/g, " ")}`);
    }
  },
});
console.log(`\nสรุป: ${r.stopReason}, ${r.iterations} รอบ\n${r.finalText}`);
