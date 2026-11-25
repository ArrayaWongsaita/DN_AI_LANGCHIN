// 18-05: Test Structured Output
// แนวคิด: ทดสอบว่า "รูปร่างข้อมูล" ถูกต้อง — และอย่าเชื่อ model/parser อย่างเดียว ให้ validate ด้วย Zod อีกชั้นก่อนใช้งานจริง
import assert from "node:assert/strict";
import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { createScriptedChatModel } from "../../src/utils/scripted-model.js";
import { isMain } from "../../src/utils/is-main.js";

export const TaskDraft = z.object({
  title: z.string().min(1),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

const toolCall = (args: Record<string, unknown>) =>
  new AIMessage({ content: "", tool_calls: [{ id: "x", name: "task", args }] });

export async function run() {
  const good = { title: "ซื้อกาแฟ", priority: "high", dueDate: "2026-12-01" };
  const bad = { title: "ซื้อกาแฟ", priority: "urgent", dueDate: "พรุ่งนี้" }; // model เดาเกินสเปก
  const model = createScriptedChatModel([toolCall(good), toolCall(bad)]);
  const extractor = model.withStructuredOutput(TaskDraft, { name: "task" });

  const a = await extractor.invoke("เพิ่มงานซื้อกาแฟเร่งด่วน กำหนด 1 ธ.ค.");
  assert.equal(TaskDraft.safeParse(a).success, true);
  console.log("✓ รูปร่างถูกต้อง:", JSON.stringify(a));

  // parser ส่งของที่ผิดสเปกออกมาได้ → ต้องตรวจเองด้วย safeParse (นี่คือ "ด่านที่สอง")
  const b = await extractor.invoke("เพิ่มงานซื้อกาแฟเร่งด่วน กำหนดพรุ่งนี้");
  const check = TaskDraft.safeParse(b);
  assert.equal(check.success, false);
  const issues = check.success ? [] : check.error.issues.map((i) => i.path.join("."));
  assert.deepEqual(issues.sort(), ["dueDate", "priority"]);
  console.log("✓ จับค่าที่ผิดสเปกได้ ที่ field:", issues.join(", "));
  return { valid: true, invalidFields: issues };
}

if (isMain(import.meta.url)) await run();
