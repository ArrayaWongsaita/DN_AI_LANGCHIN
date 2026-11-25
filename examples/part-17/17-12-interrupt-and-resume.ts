// 17-12: Interrupt and Resume
// แนวคิด: ถ้า checkpointer อยู่ใน Postgres — interrupt รอได้ข้ามโปรเซส (เช่น ผู้ใช้กดอนุมัติพรุ่งนี้) แค่ใช้ thread_id เดิม
import { Command } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { createTaskTools } from "../../src/data/tasks.js";
import { createChatModel } from "../../src/models/index.js";
import { withPostgresMemory } from "../../src/memory/postgres.js";
import { createApprovalMiddleware } from "../../src/middleware/index.js";
import { retryAsync } from "../../src/utils/retry.js";
import { messageText } from "../../src/utils/text.js";
import { contextSchema, newStore, somchai } from "./_shared.js";

const thread = { configurable: { thread_id: `approval-${Date.now()}` }, context: somchai("admin"), recursionLimit: 10 };
const model = await createChatModel({ maxTokens: 1500 });
const build = (checkpointer: Parameters<typeof createAgent>[0]["checkpointer"], store = newStore()) =>
  createAgent({ model, tools: createTaskTools(store), contextSchema, systemPrompt: "เมื่อผู้ใช้สั่งลบงาน ให้เรียก deleteTask ทันที ระบบจะหยุดขออนุมัติจากมนุษย์เอง ห้ามถามยืนยันซ้ำเป็นข้อความ", checkpointer, middleware: createApprovalMiddleware({ requireFor: ["deleteTask"] }) });

console.log("--- โปรเซสที่ 1: ขอลบ แล้วหยุดรอ ---");
await withPostgresMemory(async ({ checkpointer }) => {
  const r = await retryAsync(() => build(checkpointer).invoke({ messages: [{ role: "user", content: "ลบงาน t3 ให้หน่อย" }] }, thread));
  const pending = r.__interrupt__?.[0]?.value as { actionRequests: unknown[] } | undefined;
  if (!pending) throw new Error("โมเดลไม่ได้เรียก deleteTask จึงไม่มีการหยุดรออนุมัติ — ลองรันใหม่");
  console.log("หยุดรออนุมัติ:", JSON.stringify(pending.actionRequests));
  console.log("ปิดทุก connection (จำลองว่าปิดโปรแกรมไปแล้ว)");
});

console.log("\n--- โปรเซสที่ 2: agent + connection ใหม่หมด แล้ว resume ---");
await withPostgresMemory(async ({ checkpointer }) => {
  const store = newStore(); // ข้อมูลงานจริงอยู่ที่ฐานข้อมูลของแอป (ที่นี่จำลองด้วย store ใหม่)
  const r = await retryAsync(() => build(checkpointer, store).invoke(new Command({ resume: { decisions: [{ type: "approve" }] } }), thread));
  console.log("ตอบ:", messageText(r.messages.at(-1)!).trim());
  console.log("t3 ยังอยู่ไหม:", store.get("u1", "t3") ? "ยังอยู่" : "ถูกลบแล้ว");
});
