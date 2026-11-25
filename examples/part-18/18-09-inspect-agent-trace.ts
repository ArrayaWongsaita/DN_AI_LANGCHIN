// 18-09: Inspect Agent Trace
// แนวคิด: trace คือต้นไม้ของ run — root (agent) → model call / tool call ย่อยๆ ดึงกลับมาอ่านด้วยโค้ดได้ (ตรวจ token, เวลา, tool ที่ถูกเรียก)
import { randomUUID } from "node:crypto";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { Client, type Run } from "langsmith";
import { requireLangSmith } from "../../src/utils/langsmith.js";
import { createChatModel } from "../../src/models/index.js";
import { retryAsync } from "../../src/utils/retry.js";
import { adminContext, buildTaskAgent } from "./_agent.js";

requireLangSmith();
const runId = randomUUID(); // กำหนด id ของ root run เอง จะได้ดึงกลับมาอ่านได้แน่นอน
const { agent } = buildTaskAgent(await createChatModel({ maxTokens: 1500 }));
await retryAsync(() =>
  agent.invoke(
    { messages: [{ role: "user", content: "เพิ่มงาน ซื้อกาแฟ แล้วบอกว่ามีงานทั้งหมดกี่งาน" }] },
    { configurable: { thread_id: `inspect-${Date.now()}` }, context: adminContext, runId, runName: "task-agent-inspect", tags: ["part-18"] },
  ),
);
await awaitAllCallbacks();

// หมายเหตุ: readRun() ใน langsmith 0.14 ถูกประกาศ deprecated (ใช้ได้ถึงต้นปี 2027) จึงมี warning แสดงตอนรัน
// trace เข้า LangSmith แบบ asynchronous — รอจนอ่านเจอ (ไม่เกิน ~40 วินาที)
const client = new Client();
let root: Run | undefined;
for (let i = 0; i < 20 && !root; i++) {
  try {
    root = await client.readRun(runId, { loadChildRuns: true });
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
  }
}
if (!root) throw new Error("อ่าน trace ไม่พบ (อาจยังไม่ถูก ingest หรือ quota เต็ม) — ลองเปิดดูใน smith.langchain.com");

const ms = (r: Run) => (r.end_time && r.start_time ? new Date(r.end_time).getTime() - new Date(r.start_time).getTime() : 0);
let models = 0;
let tools = 0;
let tokens = 0;
function walk(r: Run, depth = 0) {
  if (r.run_type === "llm") {
    models++;
    tokens += r.total_tokens ?? 0;
  }
  if (r.run_type === "tool") tools++;
  if (r.run_type === "llm" || r.run_type === "tool" || depth === 0) {
    console.log(`${"  ".repeat(depth)}${r.run_type.padEnd(5)} ${r.name} · ${ms(r)} ms${r.total_tokens ? ` · ${r.total_tokens} token` : ""}${r.error ? ` · ERROR ${r.error.split("\n")[0].slice(0, 110)}…` : ""}`);
  }
  for (const child of r.child_runs ?? []) walk(child, depth + (r.run_type === "chain" && depth > 0 ? 0 : 1));
}
walk(root);
console.log(`\nสรุป trace: เรียก model ${models} ครั้ง, เรียก tool ${tools} ครั้ง, ใช้ ${tokens} token, รวม ${ms(root)} ms`);
