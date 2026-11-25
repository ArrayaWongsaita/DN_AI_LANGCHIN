// 12-01: No Memory
// ปัญหา: agent ไม่มี checkpointer → แต่ละ invoke เป็นบทสนทนาใหม่ ไม่จำอะไรเลย
import { createAgent } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const agent = createAgent({ model: await createChatModel({ maxTokens: 1500 }), tools: [] });

await agent.invoke({ messages: [{ role: "user", content: "ฉันชื่อมะลิ จำไว้นะ" }] });
const r = await agent.invoke({ messages: [{ role: "user", content: "ฉันชื่ออะไร" }] });
console.log("คำถามที่สอง → ตอบว่า:", messageText(r.messages.at(-1)!).trim());
console.log("จำนวนข้อความใน state:", r.messages.length, "(มีแค่คำถามนี้กับคำตอบ)");
