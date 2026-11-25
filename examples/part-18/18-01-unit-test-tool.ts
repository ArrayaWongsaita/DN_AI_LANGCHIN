// 18-01: Unit Test Tool
// แนวคิด: tool คือฟังก์ชันธรรมดา — ทดสอบได้ตรงๆ ด้วย .invoke() โดยไม่ต้องมี model, key หรือเน็ต (เร็ว ฟรี ผลเหมือนเดิมทุกครั้ง)
import assert from "node:assert/strict";
import { TaskStore, createTaskToolset } from "../../src/data/tasks.js";
import { add } from "../../src/tools/index.js";
import { isMain } from "../../src/utils/is-main.js";

export async function run() {
  // 1) tool คำนวณ: input → output ที่แน่นอน
  const sum = await add.invoke({ a: 2, b: 3 });
  assert.equal(sum, "5");
  console.log("✓ add(2, 3) =", sum);

  // 2) tool ที่มี state: ใช้ store จำลอง + ส่ง context แบบเดียวกับที่ agent ส่ง (userId มาจาก context ไม่ใช่ args)
  const store = new TaskStore();
  const { createTask } = createTaskToolset(store);
  const created = JSON.parse(await createTask.invoke({ title: "ซื้อกาแฟ" }, { context: { userId: "u1" } } as never));
  assert.equal(created.ownerId, "u1");
  assert.equal(store.list("u1").length, 4);
  console.log("✓ createTask → สร้าง", created.id, "ให้ u1");

  // 3) ข้อมูลของ user อื่นต้องไม่เปลี่ยน
  assert.equal(store.list("u2").length, 1);
  console.log("✓ งานของ u2 ไม่ถูกแตะ");
  return { sum, createdId: created.id as string, u1Count: store.list("u1").length };
}

if (isMain(import.meta.url)) await run();
