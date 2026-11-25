// 12-03: Same Thread
// แนวคิด: thread เดียวกัน = ประวัติต่อเนื่อง; ส่งเฉพาะข้อความใหม่ ไม่ต้องส่งประวัติเอง (ต่างจาก Part 04)
import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const checkpointer = new MemorySaver();
const agent = createAgent({
  model: await createChatModel({ maxTokens: 1500 }),
  tools: [],
  systemPrompt: "ตอบสั้นๆ 1 ประโยค",
  checkpointer,
});
const config = { configurable: { thread_id: "chat-1" } };

for (const q of ["ฉันชอบกาแฟเย็น", "ฉันบอกอะไรเกี่ยวกับเครื่องดื่มไปบ้าง", "แล้วควรสั่งอะไรกินคู่กัน"]) {
  const r = await agent.invoke({ messages: [{ role: "user", content: q }] }, config);
  console.log(`> ${q}\n  ${messageText(r.messages.at(-1)!).trim()}  [state: ${r.messages.length} ข้อความ]`);
}

// ดู state ที่ checkpointer เก็บไว้ (agent.getState เป็น internal API จึงอ่านผ่าน checkpointer ตรงๆ)
const tuple = await checkpointer.getTuple(config);
console.log("\nข้อความที่ checkpointer เก็บ:", (tuple?.checkpoint.channel_values.messages as unknown[]).length);
