// 17-07: Dynamic Model Selection
// แนวคิด: เลือก model ต่อรอบใน wrapModelCall — คำถามสั้นใช้ตัวเล็กที่ถูก/เร็ว คำถามยาวใช้ตัวที่เก่งกว่า
import { createAgent, createMiddleware } from "langchain";
import { createTaskTools } from "../../src/data/tasks.js";
import { createChatModel } from "../../src/models/index.js";
import { ask, contextSchema, newStore, somchai } from "./_shared.js";

const fast = await createChatModel({ provider: "tokenme", maxTokens: 1500 });
const strong = await createChatModel({ provider: "deepseek", thinking: false, maxTokens: 1500 });

const router = createMiddleware({
  name: "ModelRouter",
  wrapModelCall: (request, handler) => {
    const total = request.messages.reduce((n, m) => n + String(typeof m.content === "string" ? m.content : "").length, 0);
    const useStrong = total > 120;
    console.log(`  [ModelRouter] ข้อความรวม ${total} ตัวอักษร → ${useStrong ? "deepseek (ตัวแรง)" : "tokenme (ตัวเร็ว)"}`);
    return handler({ ...request, model: useStrong ? strong : fast });
  },
});

const agent = createAgent({ model: fast, tools: createTaskTools(newStore()), contextSchema, middleware: [router] });

const longQuestion =
  "ช่วยดูงานทั้งหมดของฉันแล้ววิเคราะห์ว่างานไหนควรทำก่อน เพราะอะไร โดยพิจารณาจากชื่องานและสถานะ แล้วสรุปเป็นข้อๆ ให้ชัดเจน";
for (const q of ["มีงานกี่งาน", longQuestion]) {
  console.log(`\nถาม: ${q}`);
  console.log("ตอบ:", await ask(agent, q, somchai("viewer")));
}
