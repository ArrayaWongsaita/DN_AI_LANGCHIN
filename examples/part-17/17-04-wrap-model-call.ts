// 17-04: wrapModelCall — ห่อการเรียก model
// แนวคิด: wrapModelCall ได้ request (model, messages, tools, systemPrompt) และ handler — แก้ request ก่อน, จับเวลา, จับ error ได้
import { createAgent, createMiddleware } from "langchain";
import { createTaskTools } from "../../src/data/tasks.js";
import { createChatModel } from "../../src/models/index.js";
import { ask, contextSchema, newStore, somchai } from "./_shared.js";

const timing = createMiddleware({
  name: "ModelTiming",
  wrapModelCall: async (request, handler) => {
    console.log(`  [wrapModelCall] ส่ง ${request.messages.length} ข้อความ, ${request.tools.length} tool ให้ model`);
    const start = Date.now();
    // แก้ request ก่อนส่ง: เติมกติกาท้าย system prompt (ไม่แตะ state ของ agent)
    const response = await handler({ ...request, systemPrompt: `${request.systemPrompt ?? ""}\nตอบสั้นๆ ไม่เกิน 2 ประโยค`.trim() });
    console.log(`  [wrapModelCall] model ใช้เวลา ${Date.now() - start} ms`);
    return response;
  },
});

const agent = createAgent({
  model: await createChatModel({ maxTokens: 1500 }),
  tools: createTaskTools(newStore()),
  contextSchema,
  middleware: [timing],
});

console.log("ตอบ:", await ask(agent, "สรุปงานของฉันให้หน่อย", somchai("viewer")));
