// 12-05: PostgresSaver
// แนวคิด: เก็บ checkpoint ลง PostgreSQL → อยู่รอดแม้รีสตาร์ท (ต้อง `docker compose up -d`)
import { createAgent } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { withPostgresMemory } from "../../src/memory/postgres.js";
import { messageText } from "../../src/utils/text.js";

await withPostgresMemory(async ({ checkpointer }) => {
  const agent = createAgent({ model: await createChatModel({ maxTokens: 1500 }), tools: [], systemPrompt: "ตอบสั้นๆ 1 ประโยค", checkpointer });
  const config = { configurable: { thread_id: `demo-pg-${Date.now()}` } };
  await agent.invoke({ messages: [{ role: "user", content: "ฉันชื่อมะลิ" }] }, config);
  const r = await agent.invoke({ messages: [{ role: "user", content: "ฉันชื่ออะไร" }] }, config);
  console.log("ตอบว่า:", messageText(r.messages.at(-1)!).trim());
  console.log("thread:", config.configurable.thread_id, "| state ใน Postgres:", ((await checkpointer.getTuple(config))?.checkpoint.channel_values.messages as unknown[]).length, "ข้อความ");
});
