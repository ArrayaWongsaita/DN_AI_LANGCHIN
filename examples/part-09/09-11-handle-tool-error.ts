// 09-11: Handle Tool Error
// แนวคิด: tool พัง/args ผิด/ไม่มี tool → ส่ง error กลับเป็น ToolMessage (status "error") ให้โมเดลรับรู้ ไม่ให้โปรแกรมล้ม
import { AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { executeToolCalls } from "../../src/agents/execute-tools.js";
import { add } from "../../src/tools/index.js";

const flaky = tool(async () => { throw new Error("บริการภายนอกไม่ตอบสนอง"); }, {
  name: "flaky",
  description: "tool ที่ล้มเหลวเสมอ (เพื่อสาธิต)",
  schema: z.object({}),
});

// จำลอง AIMessage ที่โมเดลขอ 4 call: ปกติ / args ผิด / tool ไม่มี / tool พัง
const ai = new AIMessage({
  content: "",
  tool_calls: [
    { name: "add", args: { a: 1, b: 2 }, id: "c1", type: "tool_call" },
    { name: "add", args: { a: "หนึ่ง", b: 2 }, id: "c2", type: "tool_call" },
    { name: "teleport", args: {}, id: "c3", type: "tool_call" },
    { name: "flaky", args: {}, id: "c4", type: "tool_call" },
  ],
});

for (const m of await executeToolCalls([add, flaky], ai)) {
  console.log(`[${m.tool_call_id}] status=${m.status}  ${String(m.content).split("\n")[0].slice(0, 90)}`);
}
console.log("→ ทุก call ได้ ToolMessage ครบ โปรแกรมไม่ล้ม; โมเดลเห็น error แล้วตัดสินใจต่อเอง");
