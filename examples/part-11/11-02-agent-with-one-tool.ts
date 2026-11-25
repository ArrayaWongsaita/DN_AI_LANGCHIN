// 11-02: Agent with One Tool
// แนวคิด: ส่ง tool ให้ createAgent — มันวน "ขอ tool → รัน → ตอบ" ให้เองทั้งหมด (เทียบกับโค้ด 40 บรรทัดใน Part 10)
import { createAgent } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { getWeather } from "../../src/tools/index.js";
import { messageText } from "../../src/utils/text.js";

const agent = createAgent({ model: await createChatModel({ maxTokens: 2000 }), tools: [getWeather] });
const result = await agent.invoke({ messages: [{ role: "user", content: "อากาศที่เชียงใหม่เป็นอย่างไร" }] });

for (const m of result.messages) {
  const calls = "tool_calls" in m ? (m as { tool_calls?: { name: string }[] }).tool_calls ?? [] : [];
  console.log(`[${m.getType()}]`, calls.length ? `ขอ ${calls.map((c) => c.name).join(", ")}` : messageText(m).trim().slice(0, 100));
}
