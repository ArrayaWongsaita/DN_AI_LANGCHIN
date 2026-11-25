// 11-08: Agent Error Handling
// แนวคิด: ต้องเตรียมรับ 3 แบบ — (1) tool พัง (2) agent วนเกิน recursionLimit (3) ผู้ใช้ยกเลิก
// ใช้ scripted model เพื่อให้ผลซ้ำได้แน่นอนและไม่เสียโควตา
import { AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";
import { z } from "zod";
import { messageText } from "../../src/utils/text.js";
import { createScriptedChatModel } from "../../src/utils/scripted-model.js";

const callTool = (name: string, id: string) => new AIMessage({ content: "", tool_calls: [{ name, args: {}, id, type: "tool_call" }] });
const flaky = tool(async () => { throw new Error("ฐานข้อมูลไม่ตอบสนอง"); }, { name: "lookup", description: "ค้นข้อมูล (พังเสมอ)", schema: z.object({}) });

console.log("(1) tool พัง — agent ส่ง error ให้โมเดลแล้วโมเดลอธิบายผู้ใช้ได้");
const a1 = createAgent({ model: createScriptedChatModel([callTool("lookup", "c1"), new AIMessage("ขออภัย ระบบค้นข้อมูลขัดข้อง ลองใหม่ภายหลังนะคะ")]), tools: [flaky] });
const r1 = await a1.invoke({ messages: [{ role: "user", content: "ค้นข้อมูลให้หน่อย" }] });
console.log("  ", r1.messages.map((m) => m.getType()).join(" → "), "|", messageText(r1.messages.at(-1)!));

console.log("\n(2) โมเดลวนขอ tool ไม่หยุด — recursionLimit ตัดให้");
const endless = createScriptedChatModel(Array.from({ length: 30 }, (_, i) => callTool("lookup", `e${i}`)));
const a2 = createAgent({ model: endless, tools: [flaky] });
try {
  await a2.invoke({ messages: [{ role: "user", content: "x" }] }, { recursionLimit: 6 });
} catch (e) {
  console.log(`   ${(e as Error).name}: ${(e as Error).message.split("\n")[0].slice(0, 90)}`);
}

console.log("\n(3) ผู้ใช้ยกเลิกก่อนเริ่ม");
const ctrl = new AbortController();
ctrl.abort();
try {
  await a1.invoke({ messages: [{ role: "user", content: "x" }] }, { signal: ctrl.signal });
} catch (e) {
  console.log(`   ${(e as Error).name}: ${(e as Error).message.slice(0, 80)}`);
}
