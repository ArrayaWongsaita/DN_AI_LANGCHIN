// 18-02: Test Tool Validation
// แนวคิด: Zod schema คือด่านแรกของ tool — ทดสอบว่า input แย่ๆ ถูกปฏิเสธ "ก่อน" ถึงโค้ดของเรา (และ model เห็น error ที่อ่านรู้เรื่อง)
import assert from "node:assert/strict";
import { TaskStore, createTaskToolset } from "../../src/data/tasks.js";
import { isMain } from "../../src/utils/is-main.js";

export async function run() {
  const store = new TaskStore();
  const { createTask, updateTask } = createTaskToolset(store);
  const config = { context: { userId: "u1" } } as never;

  const cases: [string, () => Promise<unknown>][] = [
    ["title ว่าง", () => createTask.invoke({ title: "" }, config)],
    ["ไม่มี title", () => createTask.invoke({} as never, config)],
    ["title ยาวเกิน 200", () => createTask.invoke({ title: "ก".repeat(201) }, config)],
    ["status นอก enum", () => updateTask.invoke({ id: "t1", status: "archived" } as never, config)],
  ];

  const rejected: string[] = [];
  for (const [label, attempt] of cases) {
    await assert.rejects(attempt, (e: unknown) => e instanceof Error, `${label} ควรถูกปฏิเสธ`);
    rejected.push(label);
    console.log(`✓ ปฏิเสธ: ${label}`);
  }
  assert.equal(store.list("u1").length, 3, "ข้อมูลต้องไม่เปลี่ยนเมื่อ input ไม่ผ่าน");

  // ไม่มี userId ใน context = ไม่ใช่ผู้ใช้ที่พิสูจน์ตัวตนแล้ว → ต้อง error (ไม่เดา user ให้)
  await assert.rejects(createTask.invoke({ title: "ok" }, { context: {} } as never), /userId/);
  console.log("✓ ปฏิเสธเมื่อไม่มี userId ใน context");
  return { rejected, countAfter: store.list("u1").length };
}

if (isMain(import.meta.url)) await run();
