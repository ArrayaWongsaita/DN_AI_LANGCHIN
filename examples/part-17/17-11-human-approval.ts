// 17-11: Human Approval
// แนวคิด: tool ที่ทำลายข้อมูล (deleteTask) ต้อง "หยุดรอมนุษย์" — agent หยุดที่ interrupt, มนุษย์ approve/edit/reject, แล้ว resume ด้วย Command
import { Command, MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { createTaskTools } from "../../src/data/tasks.js";
import { createChatModel } from "../../src/models/index.js";
import { createApprovalMiddleware, type ApprovalDecision } from "../../src/middleware/index.js";
import { retryAsync } from "../../src/utils/retry.js";
import { messageText } from "../../src/utils/text.js";
import { contextSchema, newStore, somchai } from "./_shared.js";

const store = newStore();
const agent = createAgent({
  model: await createChatModel({ maxTokens: 1500 }),
  tools: createTaskTools(store),
  contextSchema,
  checkpointer: new MemorySaver(), // interrupt ต้องมี checkpointer — สถานะที่หยุดไว้ถูกเก็บที่นี่
  middleware: createApprovalMiddleware({ requireFor: ["deleteTask"] }),
});

async function run(thread: string, question: string, decision: ApprovalDecision) {
  const config = { configurable: { thread_id: thread }, context: somchai("admin"), recursionLimit: 10 };
  console.log(`\nถาม: ${question}`);
  const paused = await retryAsync(() => agent.invoke({ messages: [{ role: "user", content: question }] }, config));
  const request = paused.__interrupt__?.[0]?.value as { actionRequests: { name: string; args: unknown }[] } | undefined;
  console.log("  ⏸  agent หยุดรออนุมัติ:", JSON.stringify(request?.actionRequests));
  console.log(`  งานที่เหลือระหว่างรอ: ${store.list("u1").length} งาน (ยังไม่ถูกลบ)`);
  console.log("  👤 มนุษย์ตัดสินใจ:", JSON.stringify(decision));
  const done = await retryAsync(() => agent.invoke(new Command({ resume: { decisions: [decision] } }), config));
  console.log("  ตอบ:", messageText(done.messages.at(-1)!).trim());
  console.log(`  งานที่เหลือหลังตัดสินใจ: ${store.list("u1").length} งาน`);
}

await run("approve-flow", "ลบงาน t2 (ประชุมทีม backend) ให้หน่อย", { type: "approve" });
await run("reject-flow", "ลบงาน t1 ให้หน่อย", { type: "reject", message: "ยังไม่อยากลบงานนี้" });
