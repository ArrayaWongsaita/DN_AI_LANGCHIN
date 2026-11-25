// 10-05: Parallel Tool Calls
// แนวคิด: ถ้าโมเดลขอหลาย call พร้อมกัน เรารันด้วย Promise.all แล้วจับคู่ผลกลับด้วย tool_call_id
// ข้อควรระวัง: tool ที่มี side effect (เขียน/ลบ) ไม่ควรรันขนานโดยไม่คิด — ลำดับอาจสำคัญ
import { AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { executeToolCalls } from "../../src/agents/execute-tools.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const slowLookup = tool(
  async ({ city, ms }) => {
    await sleep(ms);
    return `ข้อมูลของ ${city}`;
  },
  { name: "slowLookup", description: "ค้นข้อมูลที่ช้า (จำลอง)", schema: z.object({ city: z.string(), ms: z.number() }) },
);

// จำลอง AIMessage ที่ขอ 3 call (call แรกช้าที่สุด) — deterministic ไม่เรียก LLM
const ai = new AIMessage({
  content: "",
  tool_calls: [
    { name: "slowLookup", args: { city: "A", ms: 300 }, id: "id-A", type: "tool_call" },
    { name: "slowLookup", args: { city: "B", ms: 100 }, id: "id-B", type: "tool_call" },
    { name: "slowLookup", args: { city: "C", ms: 200 }, id: "id-C", type: "tool_call" },
  ],
});

const t = performance.now();
const results = await executeToolCalls([slowLookup], ai);
console.log(`ใช้เวลา ${Math.round(performance.now() - t)} ms (ลำดับ: 300+100+200 = 600 ms ถ้าทำทีละตัว)`);
results.forEach((r) => console.log(`  tool_call_id=${r.tool_call_id} → ${r.content}`)); // ลำดับผลตรงกับลำดับ call แม้ B เสร็จก่อน
