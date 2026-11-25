// 17-05: wrapToolCall — ห่อการรัน tool
// แนวคิด: wrapToolCall คุม "ทุก tool call" จุดเดียว — เหมาะกับ audit log และจับ error ให้ model เห็นเป็น ToolMessage
import { createAgent } from "langchain";
import { createTaskTools } from "../../src/data/tasks.js";
import { createChatModel } from "../../src/models/index.js";
import { createAuditMiddleware, createToolErrorMiddleware, type AuditEntry } from "../../src/middleware/index.js";
import { ask, contextSchema, newStore, somchai } from "./_shared.js";

const audit: AuditEntry[] = [];

const agent = createAgent({
  model: await createChatModel({ maxTokens: 1500 }),
  tools: createTaskTools(newStore()),
  contextSchema,
  // ลำดับสำคัญ: ตัวแรกอยู่ชั้นนอกสุด — ToolError จับ error ที่หลุดจากชั้นใน
  middleware: [createToolErrorMiddleware(), createAuditMiddleware(audit)],
});

console.log("ตอบ:", await ask(agent, "เพิ่มงาน 'ซื้อหนังสือ' แล้วแก้งาน t99 เป็น 'อะไรก็ได้'", somchai("editor")));
console.log("\nAudit log:");
for (const e of audit) console.log(`  ${e.userId} ${e.tool}(${JSON.stringify(e.args)}) ok=${e.ok}`);
