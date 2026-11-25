// 10-06: Maximum Iterations
// แนวคิด: ต้องมีเพดานจำนวนรอบเสมอ — โมเดลอาจขอ tool วนซ้ำไม่รู้จบ (ค่าใช้จ่ายและเวลาพุ่ง)
// ใช้ scripted model ที่ "ขอ tool ทุกรอบ" เพื่อให้ผลทำซ้ำได้แน่นอนและไม่เสียโควตา
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { runAgentLoop } from "../../src/agents/agent-loop.js";
import { workshopTools } from "../../src/tools/index.js";
import { createScriptedChatModel } from "../../src/utils/scripted-model.js";

const scriptedForever = () =>
  createScriptedChatModel(
    Array.from({ length: 20 }, (_, i) => new AIMessage({ content: "", tool_calls: [{ name: "getCurrentDate", args: {}, id: `c${i}`, type: "tool_call" }] })),
  );

for (const maxIterations of [3, 5]) {
  const model = scriptedForever();
  const r = await runAgentLoop({ model, tools: workshopTools, messages: [new HumanMessage("วันนี้วันที่เท่าไร")], maxIterations });
  console.log(`maxIterations=${maxIterations} → stopReason=${r.stopReason}, เรียกโมเดล ${model.calls} ครั้ง, ข้อความทั้งหมด ${r.messages.length}`);
}
console.log("→ ไม่ว่าโมเดลจะวนแค่ไหน loop หยุดตามเพดาน และผู้เรียกตรวจ stopReason เพื่อรู้ว่าคำตอบไม่สมบูรณ์");
