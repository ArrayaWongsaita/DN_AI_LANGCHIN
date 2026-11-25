// 18-06: Test Agent Tool Calls
// แนวคิด: ทดสอบ agent ที่ "trajectory" (ลำดับ tool + args) ไม่ใช่ข้อความตอบ — ข้อความเปลี่ยนได้ทุกครั้ง แต่การเลือก tool ต้องคงที่
import assert from "node:assert/strict";
import { AIMessage } from "@langchain/core/messages";
import { assertTrajectory } from "../../src/eval/trajectory.js";
import { createScriptedChatModel } from "../../src/utils/scripted-model.js";
import { isMain } from "../../src/utils/is-main.js";
import { adminContext, buildTaskAgent } from "./_agent.js";

const call = (id: string, name: string, args: Record<string, unknown> = {}) =>
  new AIMessage({ content: "", tool_calls: [{ id, name, args }] });

export async function run() {
  const model = createScriptedChatModel([
    call("1", "getTasks"),
    call("2", "createTask", { title: "ซื้อกาแฟ" }),
    new AIMessage("เพิ่มงานแล้ว"),
  ]);
  const { agent } = buildTaskAgent(model);
  const r = await agent.invoke(
    { messages: [{ role: "user", content: "ดูงานแล้วเพิ่มงานซื้อกาแฟ" }] },
    { configurable: { thread_id: "t18-06" }, context: adminContext },
  );

  assertTrajectory(r.messages, [{ name: "getTasks" }, { name: "createTask", args: { title: "ซื้อกาแฟ" } }]);
  console.log("✓ trajectory ถูกต้อง: getTasks → createTask(title=ซื้อกาแฟ)");

  // ทดสอบกลับด้าน: ลำดับผิดต้อง "เห็น" ว่าผิด
  assert.throws(() => assertTrajectory(r.messages, [{ name: "createTask" }, { name: "getTasks" }]), /ลำดับที่ 1/);
  console.log("✓ ลำดับที่ผิดถูกจับได้");
  return { calls: r.messages.length };
}

if (isMain(import.meta.url)) await run();
