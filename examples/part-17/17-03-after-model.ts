// 17-03: afterModel — ตรวจ/บันทึกผลของ model
// แนวคิด: afterModel รันหลัง model ตอบ (ก่อนรัน tool) — ใช้สะสม token usage ใน state ของ agent ได้
import { createAgent, createMiddleware } from "langchain";
import { z } from "zod";
import { createTaskTools } from "../../src/data/tasks.js";
import { createChatModel } from "../../src/models/index.js";
import { ask, contextSchema, newStore, somchai } from "./_shared.js";

const tokenMonitor = createMiddleware({
  name: "TokenMonitor",
  stateSchema: z.object({ totalTokens: z.number().default(0), modelCalls: z.number().default(0) }),
  afterModel: (state) => {
    const last = state.messages.at(-1) as { usage_metadata?: { total_tokens?: number } };
    const used = last.usage_metadata?.total_tokens ?? 0;
    const totalTokens = state.totalTokens + used;
    const modelCalls = state.modelCalls + 1;
    console.log(`  [TokenMonitor] รอบที่ ${modelCalls}: ใช้ ${used} token (สะสม ${totalTokens})`);
    return { totalTokens, modelCalls };
  },
});

const agent = createAgent({
  model: await createChatModel({ maxTokens: 1500 }),
  tools: createTaskTools(newStore()),
  contextSchema,
  middleware: [tokenMonitor],
});

const r = await agent.invoke(
  { messages: [{ role: "user", content: "สร้างงาน 'โทรหาลูกค้า' แล้วบอกว่าตอนนี้มีกี่งาน" }] },
  { context: somchai("editor"), recursionLimit: 10 },
);
console.log(`\nสรุป: เรียก model ${r.modelCalls} รอบ รวม ${r.totalTokens} token`);
