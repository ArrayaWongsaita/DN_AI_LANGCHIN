// 11-03: Agent with Multiple Tools
// แนวคิด: agent เลือก tool เอง — ลำดับ/จำนวนรอบไม่ได้ถูกกำหนดล่วงหน้า (ต่างจาก workflow)
import { createAgent } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { retryAsync } from "../../src/utils/retry.js";
import { workshopTools } from "../../src/tools/index.js";
import { messageText } from "../../src/utils/text.js";

const agent = createAgent({ model: await createChatModel({ maxTokens: 2500 }), tools: workshopTools });

for (const q of ["อากาศที่ภูเก็ตเป็นอย่างไร", "ค้นหา keyboard ให้หน่อย แล้วบอกวันที่วันนี้ด้วย"]) {
  // Groq gpt-oss บางครั้งทำชื่อ tool เพี้ยน (HTTP 400 tool_use_failed) — error ชั่วคราว ลองใหม่ได้ (ดู README หัวข้อ Common Mistakes)
  const r = await retryAsync(() => agent.invoke({ messages: [{ role: "user", content: q }] }));
  const used = r.messages.flatMap((m) => ("tool_calls" in m ? (m as { tool_calls?: { name: string }[] }).tool_calls ?? [] : [])).map((c) => c.name);
  console.log(`\n${q}\n  tools: ${used.join(" → ") || "(ไม่ใช้)"}\n  ตอบ: ${messageText(r.messages.at(-1)!).trim()}`);
}
