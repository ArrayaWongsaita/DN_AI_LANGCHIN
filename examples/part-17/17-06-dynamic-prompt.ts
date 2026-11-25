// 17-06: Dynamic Prompt
// แนวคิด: system prompt สร้างจาก runtime context ทุกครั้ง — agent ตัวเดียว ตอบต่างกันตามผู้ใช้ (ชื่อ, role, ภาษา)
import { createAgent } from "langchain";
import { createTaskTools } from "../../src/data/tasks.js";
import { createChatModel } from "../../src/models/index.js";
import { createDynamicPromptMiddleware } from "../../src/middleware/index.js";
import { ask, contextSchema, newStore, somchai } from "./_shared.js";

const agent = createAgent({
  model: await createChatModel({ maxTokens: 1500 }),
  tools: createTaskTools(newStore()),
  contextSchema,
  middleware: [createDynamicPromptMiddleware("คุณคือผู้ช่วยจัดการงาน ตอบสั้นกระชับ")],
});

const contexts = [somchai("viewer"), { ...somchai("admin"), name: "Alice", language: "en" as const }];
for (const ctx of contexts) {
  console.log(`\n[${ctx.name} / ${ctx.role} / ${ctx.language ?? "th"}] ถาม: แนะนำตัวหน่อย และบอกว่าฉันทำอะไรได้บ้าง`);
  console.log("ตอบ:", await ask(agent, "แนะนำตัวหน่อย และบอกว่าฉันทำอะไรได้บ้าง (ไม่ต้องเรียก tool)", ctx));
}
