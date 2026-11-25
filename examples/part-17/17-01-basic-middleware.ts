// 17-01: Basic Middleware
// แนวคิด: middleware คือ "ชั้นคั่น" รอบ agent loop — เห็นทุกจุดของ lifecycle โดยไม่แก้โค้ด tool หรือ prompt
// lifecycle: beforeAgent → (beforeModel → model → afterModel → tools)* → afterAgent
import { createAgent, createMiddleware } from "langchain";
import { createTaskTools } from "../../src/data/tasks.js";
import { createChatModel } from "../../src/models/index.js";
import { ask, contextSchema, newStore, somchai } from "./_shared.js";

const lifecycle = createMiddleware({
  name: "LifecycleTracer",
  beforeAgent: () => void console.log("  [beforeAgent]  เริ่มงาน (ครั้งเดียวต่อ invoke)"),
  beforeModel: () => void console.log("  [beforeModel]  กำลังจะเรียก model"),
  afterModel: () => void console.log("  [afterModel]   model ตอบกลับแล้ว (ยังไม่ได้รัน tool)"),
  wrapToolCall: async (request, handler) => {
    console.log(`  [wrapToolCall] ${request.toolCall.name}(${JSON.stringify(request.toolCall.args)})`);
    return handler(request);
  },
  afterAgent: () => void console.log("  [afterAgent]   จบงาน (ครั้งเดียวต่อ invoke)"),
});

const agent = createAgent({
  model: await createChatModel({ maxTokens: 1500 }),
  tools: createTaskTools(newStore()),
  contextSchema,
  middleware: [lifecycle],
});

console.log("ถาม: ฉันมีงานอะไรบ้าง");
console.log("ตอบ:", await ask(agent, "ฉันมีงานอะไรบ้าง", somchai("viewer")));
