// 10-04: Dependent Tool Calls
// แนวคิด: call ที่ 2 ต้องใช้ผลของ call ที่ 1 (dependent) — โมเดลรู้เพราะเห็น ToolMessage ก่อนตัดสินใจรอบถัดไป
import { HumanMessage } from "@langchain/core/messages";
import { runAgentLoop } from "../../src/agents/agent-loop.js";
import { createChatModel } from "../../src/models/index.js";
import { workshopTools } from "../../src/tools/index.js";

const model = await createChatModel({ maxTokens: 2000 });
const r = await runAgentLoop({
  model,
  tools: workshopTools,
  messages: [new HumanMessage("ใช้เครื่องมือ: หาราคา Mechanical Keyboard แล้วคูณด้วย 3 ตัว รวมกี่บาท")],
  onStep: (e) => {
    if (e.type === "model" && "tool_calls" in e.message) {
      for (const c of (e.message as { tool_calls: { name: string; args: unknown }[] }).tool_calls ?? []) {
        console.log(`  รอบ ${e.iteration}: ${c.name}(${JSON.stringify(c.args)})`);
      }
    }
  },
});
console.log(`หยุดเพราะ: ${r.stopReason} หลัง ${r.iterations} รอบ\nคำตอบ: ${r.finalText}`);
