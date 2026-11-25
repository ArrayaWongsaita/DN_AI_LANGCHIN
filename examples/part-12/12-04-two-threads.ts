// 12-04: Two Threads
// แนวคิด: thread_id ต่างกัน = บทสนทนาแยกกัน ไม่รั่วข้ามกัน
import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const agent = createAgent({
  model: await createChatModel({ maxTokens: 1500 }),
  tools: [],
  systemPrompt: "ตอบสั้นๆ 1 ประโยค ถ้าไม่รู้ให้บอกว่าไม่รู้",
  checkpointer: new MemorySaver(),
});
const ask = async (thread: string, q: string) => {
  const r = await agent.invoke({ messages: [{ role: "user", content: q }] }, { configurable: { thread_id: thread } });
  console.log(`[${thread}] > ${q}\n   ${messageText(r.messages.at(-1)!).trim()}`);
};

await ask("A", "ฉันชื่อสมชาย");
await ask("B", "ฉันชื่อสมหญิง");
await ask("A", "ฉันชื่ออะไร");
await ask("B", "ฉันชื่ออะไร");
await ask("C", "ฉันชื่ออะไร"); // thread ใหม่ ไม่เคยคุย
