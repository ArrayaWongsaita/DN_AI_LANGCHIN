// 17-08: Dynamic Tool Selection
// แนวคิด: ซ่อน tool ตาม role — viewer เห็นแค่ read-only, admin เห็นครบ (และถ้า model เรียก tool ที่ไม่มีสิทธิ์ ก็ถูกปฏิเสธตอนรัน)
// ⚠️ นี่เป็นแค่ชั้นแรก — สิทธิ์จริงต้องตรวจที่ backend/service เสมอ (Part 19)
import { createAgent, createMiddleware } from "langchain";
import { createTaskTools } from "../../src/data/tasks.js";
import { createChatModel } from "../../src/models/index.js";
import { createRoleBasedToolMiddleware } from "../../src/middleware/index.js";
import { ask, contextSchema, newStore, somchai } from "./_shared.js";

const showTools = createMiddleware({
  name: "ShowTools",
  wrapModelCall: (request, handler) => {
    console.log(`  [tools ที่ model เห็น] ${request.tools.map((t) => (t as { name: string }).name).join(", ")}`);
    return handler(request);
  },
});

const agent = createAgent({
  model: await createChatModel({ maxTokens: 1500 }),
  tools: createTaskTools(newStore()),
  contextSchema,
  middleware: [createRoleBasedToolMiddleware(), showTools],
});

for (const role of ["viewer", "admin"] as const) {
  console.log(`\n[role: ${role}] ถาม: ลบงาน t2 ให้หน่อย`);
  console.log("ตอบ:", await ask(agent, "ลบงาน t2 ให้หน่อย", somchai(role)));
}
