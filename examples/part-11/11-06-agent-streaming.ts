// 11-06: Agent Streaming
// แนวคิด: agent.stream(..., { streamMode: "messages" }) ให้ token ทีละชิ้นระหว่างที่ agent ทำงาน (UX เหมือนแชต)
import { createAgent } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { getWeather } from "../../src/tools/index.js";
import { messageText } from "../../src/utils/text.js";

const agent = createAgent({ model: await createChatModel({ maxTokens: 2500 }), tools: [getWeather] });

const stream = await agent.stream(
  { messages: [{ role: "user", content: "อากาศที่ภูเก็ตเป็นอย่างไร สรุปเป็นกลอนสั้นๆ" }] },
  { streamMode: "messages" },
);

let chunks = 0;
process.stdout.write("AI: ");
for await (const [chunk, metadata] of stream) {
  // ข้อความจาก tool ก็ไหลมาทาง stream นี้ด้วย — เลือกแสดงเฉพาะที่มาจากโมเดล
  if (chunk.getType() !== "ai") continue;
  const text = messageText(chunk);
  if (text) {
    chunks++;
    process.stdout.write(text);
  }
  void metadata; // metadata บอกว่ามาจาก node ไหน (model / tools)
}
console.log(`\n\n(ได้ ${chunks} chunks ที่มีข้อความ)`);
