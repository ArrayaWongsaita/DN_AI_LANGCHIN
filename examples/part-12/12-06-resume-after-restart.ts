// 12-06: Resume After Restart
// แนวคิด: จำลองการรีสตาร์ท — ทิ้ง agent + connection ตัวแรกทั้งหมด แล้วสร้างใหม่ ใช้ thread เดิม ข้อมูลมาจาก Postgres
import { createAgent } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { withPostgresMemory } from "../../src/memory/postgres.js";
import { messageText } from "../../src/utils/text.js";

const thread = { configurable: { thread_id: `resume-${Date.now()}` } };
const model = await createChatModel({ maxTokens: 1500 });
const build = (checkpointer: Parameters<typeof createAgent>[0]["checkpointer"]) =>
  createAgent({ model, tools: [], systemPrompt: "ตอบสั้นๆ 1 ประโยค", checkpointer });

console.log("--- โปรเซสที่ 1 ---");
await withPostgresMemory(async ({ checkpointer }) => {
  await build(checkpointer).invoke({ messages: [{ role: "user", content: "รหัสโครงการของฉันคือ ORCHID-42" }] }, thread);
  console.log("บันทึกแล้ว แล้วปิด connection ทั้งหมด");
});

console.log("--- โปรเซสที่ 2 (agent + connection ใหม่หมด) ---");
await withPostgresMemory(async ({ checkpointer }) => {
  const r = await build(checkpointer).invoke({ messages: [{ role: "user", content: "รหัสโครงการของฉันคืออะไร" }] }, thread);
  console.log("ตอบว่า:", messageText(r.messages.at(-1)!).trim());
});
