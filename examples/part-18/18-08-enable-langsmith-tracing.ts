// 18-08: Enable LangSmith Tracing
// แนวคิด: LangSmith บันทึก "ทุกขั้นตอน" ของ agent (prompt, tool call, token, เวลา) ให้ดูย้อนหลัง — เปิดด้วย env var ไม่ต้องแก้โค้ด agent
// ⚠️ free plan มี quota trace ต่อเดือน — ตัวอย่างนี้ส่งแค่ 1 trace และเปิด tracing เฉพาะตอนรันไฟล์นี้
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { requireLangSmith } from "../../src/utils/langsmith.js"; // ต้องมาก่อน: ไม่มี key → จบพร้อมข้อความ
import { createChatModel } from "../../src/models/index.js";
import { retryAsync } from "../../src/utils/retry.js";
import { messageText } from "../../src/utils/text.js";
import { adminContext, buildTaskAgent } from "./_agent.js";

const { project } = requireLangSmith(); // ตั้ง LANGSMITH_TRACING=true และ LANGSMITH_PROJECT (ค่าเริ่มต้น langchain-course)
console.log(`เปิด tracing แล้ว → project "${project}"`);

const { agent } = buildTaskAgent(await createChatModel({ maxTokens: 1500 }));
const r = await retryAsync(() =>
  agent.invoke(
    { messages: [{ role: "user", content: "ฉันมีงานอะไรบ้าง" }] },
    {
      configurable: { thread_id: `trace-${Date.now()}` },
      context: adminContext,
      runName: "task-agent-demo", // ชื่อที่เห็นในหน้า trace
      tags: ["part-18", "demo"], // ใช้กรองใน LangSmith
      metadata: { example: "18-08", userId: adminContext.userId },
    },
  ),
);
console.log("ตอบ:", messageText(r.messages.at(-1)!).trim().split("\n")[0]);

await awaitAllCallbacks(); // รอให้ trace ถูกส่งออกไปก่อนโปรแกรมจบ (ไม่งั้น trace อาจหาย)
console.log(`ส่ง trace แล้ว — เปิด https://smith.langchain.com → Tracing → project "${project}" → run "task-agent-demo"`);
