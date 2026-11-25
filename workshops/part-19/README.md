# Workshop 19 — Extend the Task API

ทำงานใน [`apps/task-api/`](../../apps/task-api/) โดยตรง (ไม่ซ้ำโค้ดใน `workshops/`) เริ่มจาก tag `part-19-15` แล้วแตก branch ของตัวเอง

> **วิธีเริ่ม (Part 19):** ไม่มี `starter/` แยก — โค้ดเฉลยคือ `apps/task-api` ให้ไล่ตาม tag (`git tag -l 'part-19-*'` / `'milestone-*'`) แล้วรัน spec ของแต่ละขั้นเพื่อดูว่าขั้นนั้นทำงานแล้ว ทำเองโดยเริ่มจากโฟลเดอร์ว่างแล้วใช้ spec เป็นตัวตรวจ

## โจทย์
เพิ่มความสามารถ "งานเกินกำหนด" และกฎธุรกิจใหม่ โดยกฎต้องบังคับใช้ **ทั้งทาง REST และทาง agent** จากที่เดียว

## Requirements
1. `TasksService.listOverdue(userId)` — งานที่ `dueDate` ผ่านแล้วและสถานะไม่ใช่ `Completed` เรียงตาม dueDate
2. REST: `GET /tasks` (รองรับ `?status=` และ `?overdue=true`) และ `PATCH /tasks/:id` ใช้ `JwtGuard`
3. Agent tool `getOverdueTasks` (adapter บางๆ เหนือข้อ 1 — ห้ามมี `userId` ใน schema)
4. กฎใหม่ที่ `TasksService.update`: งานสถานะ `Completed` **แก้ `title` ไม่ได้** → `409` พร้อมข้อความไทย (ต้องบังคับใช้เมื่อ agent เรียก `updateTask` ด้วย)
5. spec ใหม่ `test/workshop.spec.ts` (PostgreSQL จริง + model ปลอม)

## Expected Output (ตัวอย่าง)
```
GET /tasks?overdue=true  (ผู้ใช้ A)   → 200 [{ "title": "ส่งรายงาน", "dueDate": "2026-11-01", … }]   (ไม่มีงานของผู้ใช้ B)
PATCH /tasks/<completed> {"title":"x"} → 409 {"statusCode":409,"message":"งานที่เสร็จแล้วแก้ชื่อไม่ได้"}
agent: "แก้ชื่องานที่เสร็จแล้ว"       → tool updateTask ถูกเรียก → tool message เป็น error (409) → agent บอกผู้ใช้ตามจริง
```

## Acceptance Criteria
- [ ] `listOverdue` ไม่คืนงาน `Completed`, ไม่คืนงานที่ไม่มี `dueDate`, ไม่คืนงานของผู้ใช้อื่น (spec 3 กรณี)
- [ ] `GET /tasks` และ `PATCH /tasks/:id` คืน 401 เมื่อไม่มี token และ 404 เมื่อ id เป็นของผู้ใช้อื่น
- [ ] กฎข้อ 4 อยู่ที่ `TasksService` ที่เดียว — มี spec ที่เรียกผ่าน REST **และ** ผ่าน agent (scripted model) ได้ผลเดียวกัน และ `grep` ไม่พบกฎซ้ำใน controller/tool
- [ ] tool `getOverdueTasks` ไม่มีฟิลด์ `userId` ใน schema และ spec พิสูจน์ว่า model ส่ง `userId` ของคนอื่นแล้วไม่มีผล
- [ ] `pnpm --filter task-api test` และ `pnpm --filter task-api typecheck` ผ่าน
- [ ] อธิบายได้ว่าทำไมกฎต้องอยู่ที่ service ไม่ใช่ในพรอมต์

## แนวทางเฉลย (sketch — ไม่ใช่โค้ดที่รันตรวจแล้ว ใช้เทียบแนวคิด)
```ts
// tasks.repository.ts — ทุก query มี userId
listOverdue(userId: string, now = new Date()) {
  return this.prisma.task.findMany({ where: { userId, dueDate: { lt: now }, status: { not: "Completed" } }, orderBy: { dueDate: "asc" } });
}
// tasks.service.ts — กฎอยู่ที่นี่ที่เดียว (REST และ tool เรียกผ่านที่นี่)
async update(userId: string, id: string, input: unknown) {
  const data = this.parse(UpdateTaskInput, input);
  const current = await this.get(userId, id);                       // 404 ถ้าไม่ใช่ของตน
  if (current.status === "Completed" && data.title !== undefined) throw new ConflictException("งานที่เสร็จแล้วแก้ชื่อไม่ได้");
  return (await this.repo.updateOwned(userId, id, data))!;
}
// task-tools.ts — adapter บางๆ ไม่มี userId ใน schema
tool(async (_in, rt) => JSON.stringify((await tasks.listOverdue(userIdOf(rt))).map(show)), { name: "getOverdueTasks", description: "งานที่เกินกำหนด", schema: z.object({}) });
```
