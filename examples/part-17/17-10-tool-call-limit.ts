// 17-10: Tool Call Limit
// แนวคิด: จำกัดจำนวน tool call ต่อ run — กัน agent วนลูป/เผา token/ยิง API รัวๆ (exitBehavior: "end" = หยุดทันที, "continue" = บอก model ว่าเกิน limit แล้วให้ตอบต่อ — แต่ model อาจพยายามต่อจนชน recursionLimit)
import { createAgent, modelCallLimitMiddleware, toolCallLimitMiddleware } from "langchain";
import { createTaskTools } from "../../src/data/tasks.js";
import { createChatModel } from "../../src/models/index.js";
import { createLoggingMiddleware } from "../../src/middleware/index.js";
import { ask, contextSchema, newStore, somchai } from "./_shared.js";

const agent = createAgent({
  model: await createChatModel({ maxTokens: 1500 }),
  tools: createTaskTools(newStore()),
  contextSchema,
  middleware: [
    createLoggingMiddleware((e) => e.phase === "tool" && console.log(`  [tool] ${e.name}`)),
    toolCallLimitMiddleware({ runLimit: 2, exitBehavior: "end" }), // end = หยุด agent ทันทีเมื่อเกิน limit
    modelCallLimitMiddleware({ runLimit: 4, exitBehavior: "end" }), // เพดานรอบ model ต่อ run
  ],
});

console.log("ถาม: เรียก getTasks 5 ครั้งติดกัน (ทีละครั้ง) แล้วสรุปผล");
console.log("ตอบ:", await ask(agent, "เรียก getTasks 5 ครั้งติดกัน ทีละครั้ง แล้วสรุปว่ามีกี่งาน", somchai("viewer"), 25));  // recursionLimit 25: middleware หลายตัวทำให้นับ step มากขึ้น
