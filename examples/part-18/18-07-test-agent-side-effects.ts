// 18-07: Test Agent Side Effects
// แนวคิด: สิ่งที่ต้องพิสูจน์คือ "ผลข้างเคียงจริง" (ข้อมูลเปลี่ยนไหม) ไม่ใช่แค่ว่า model พูดอะไร — ลบได้เฉพาะหลังอนุมัติ และไม่ลบของคนอื่น
import assert from "node:assert/strict";
import { Command } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import { createScriptedChatModel } from "../../src/utils/scripted-model.js";
import { isMain } from "../../src/utils/is-main.js";
import { adminContext, buildTaskAgent } from "./_agent.js";

const del = (id: string, taskId: string) => new AIMessage({ content: "", tool_calls: [{ id, name: "deleteTask", args: { id: taskId } }] });

export async function run() {
  // A) ขอลบ → agent หยุด → งานต้องยังอยู่ → approve → งานหาย
  const a = buildTaskAgent(createScriptedChatModel([del("1", "t2"), new AIMessage("ลบแล้ว")]));
  const config = { configurable: { thread_id: "t18-07a" }, context: adminContext };
  const paused = await a.agent.invoke({ messages: [{ role: "user", content: "ลบ t2" }] }, config);
  assert.ok(paused.__interrupt__, "ต้องหยุดรออนุมัติ");
  assert.ok(a.store.get("u1", "t2"), "ระหว่างรออนุมัติ งานต้องยังอยู่");
  console.log("✓ ก่อนอนุมัติ: งาน t2 ยังอยู่");
  await a.agent.invoke(new Command({ resume: { decisions: [{ type: "approve" }] } }), config);
  assert.equal(a.store.get("u1", "t2"), undefined);
  console.log("✓ หลัง approve: งาน t2 ถูกลบ");

  // B) model พยายามลบงานของ u2 (t4) — ต้องไม่สำเร็จแม้ approve แล้ว
  const b = buildTaskAgent(createScriptedChatModel([del("2", "t4"), new AIMessage("เสร็จ")]));
  const configB = { configurable: { thread_id: "t18-07b" }, context: adminContext };
  await b.agent.invoke({ messages: [{ role: "user", content: "ลบ t4" }] }, configB);
  await b.agent.invoke(new Command({ resume: { decisions: [{ type: "approve" }] } }), configB);
  assert.ok(b.store.get("u2", "t4"), "งานของ u2 ต้องยังอยู่");
  assert.equal(b.audit.at(-1)?.ok, false);
  console.log("✓ ลบงานของ user อื่นไม่ได้ (audit ok=false) และงานของ u2 ยังอยู่");
  return { deletedT2: true, otherUserSafe: true };
}

if (isMain(import.meta.url)) await run();
