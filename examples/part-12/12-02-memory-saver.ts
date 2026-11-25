// 12-02: MemorySaver
// แนวคิด: checkpointer = ที่เก็บ "state ของ agent" (messages) หลังทุกขั้น; MemorySaver เก็บใน RAM (หายเมื่อปิดโปรแกรม)
import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const agent = createAgent({
  model: await createChatModel({ maxTokens: 1500 }),
  tools: [],
  checkpointer: new MemorySaver(),
});

// thread_id คือกุญแจของบทสนทนา — ต้องส่งทุกครั้งเมื่อมี checkpointer
const config = { configurable: { thread_id: "demo-1" } };
await agent.invoke({ messages: [{ role: "user", content: "ฉันชื่อมะลิ จำไว้นะ" }] }, config);
const r = await agent.invoke({ messages: [{ role: "user", content: "ฉันชื่ออะไร" }] }, config);
console.log("ตอบว่า:", messageText(r.messages.at(-1)!).trim());
console.log("จำนวนข้อความใน state:", r.messages.length);
