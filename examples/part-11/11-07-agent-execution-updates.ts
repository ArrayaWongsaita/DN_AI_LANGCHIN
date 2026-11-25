// 11-07: Agent Execution Updates
// แนวคิด: streamMode "updates" ส่ง "ความคืบหน้าทีละ node" (model ตัดสินใจ / tools ทำงาน) — เหมาะแสดง progress
import { createAgent } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { retryAsync } from "../../src/utils/retry.js";
import { workshopTools } from "../../src/tools/index.js";
import { messageText } from "../../src/utils/text.js";

const agent = createAgent({ model: await createChatModel({ maxTokens: 2500 }), tools: workshopTools });

type Delta = { messages?: { getType(): string; content: unknown; tool_calls?: { name: string }[] }[] };

// ห่อทั้งการสตรีมด้วย retryAsync: ถ้า Groq ทำชื่อ tool เพี้ยนกลางทาง (400 tool_use_failed) จะเริ่มรอบใหม่ทั้งหมด
await retryAsync(async () => {
  const stream = await agent.stream(
    { messages: [{ role: "user", content: "ค้นหา keyboard แล้วบอกวันที่วันนี้ด้วย" }] },
    { streamMode: "updates" },
  );

  for await (const update of stream) {
    for (const [node, delta] of Object.entries(update as Record<string, Delta>)) {
      const m = delta.messages?.at(-1);
      if (!m) continue;
      const what = m.tool_calls?.length ? `ขอ ${m.tool_calls.map((c) => c.name).join(", ")}` : messageText(m as never).trim().slice(0, 80);
      console.log(`[${node}] ${m.getType()}: ${what}`);
    }
  }
});
