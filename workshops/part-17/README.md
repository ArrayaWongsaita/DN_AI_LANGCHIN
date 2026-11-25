# Workshop 17 — AI Task Management Agent

> **เริ่มทำ:** เปิดโครงให้เติมที่ [`starter/`](starter/) (มี `TODO` บอกทีละจุด) — ทำเองก่อน แล้วค่อยเทียบ [`solution/`](solution/)

## โจทย์
Agent จัดการงาน (in-memory `TaskStore`) ที่ **อ่านได้ทันที**, **เพิ่ม/แก้ตามสิทธิ์**, **ลบต้องมนุษย์อนุมัติ**, **มี audit history**, และ **จำกัดจำนวน tool call**

## Requirements
1. role `viewer` (อ่านอย่างเดียว) · `editor` (+ เพิ่ม/แก้) · `admin` (+ ลบ) — ใช้ `createRoleBasedToolMiddleware`
2. `deleteTask` ต้องหยุดรออนุมัติ (`approve | reject | edit`) และ **ตรวจซ้ำตอนรัน** (ยังเป็น admin และงานยังเป็นของผู้ใช้)
3. audit log ทุก tool call รวมที่ถูกปฏิเสธ (`ok=false`) — `userId` จาก context ไม่ใช่จาก args ของ model
4. จำกัด tool call 6 ครั้งต่อ run (`TOOL_CALL_LIMIT`) — เกินแล้วหยุดพร้อมข้อความที่อ่านเข้าใจ
5. แยก logic เป็น `createTaskAgent()` + `runTurn()` เพื่อทดสอบด้วย scripted model
6. CLI: `--role viewer|editor|admin`, `--decision approve|reject`

## วิธีรัน
```bash
A=workshops/part-17/solution/task-agent.ts
pnpm exec tsx --env-file=.env $A --role viewer "เพิ่มงาน ซื้อกาแฟ แล้วบอกว่ามีงานอะไรบ้าง"
pnpm exec tsx --env-file=.env $A --role editor "เพิ่มงาน ซื้อกาแฟ"
pnpm exec tsx --env-file=.env $A --role admin --decision approve "ลบงาน t2"
pnpm exec tsx --env-file=.env $A --role admin --decision reject  "ลบงาน t1"
pnpm test tests/part17-workshop.test.ts
```

## Expected Output (ตัวอย่างจากการรันจริงบน Groq — LLM ไม่ได้ตอบเหมือนเดิมทุกครั้ง)
```
viewer : ขออภัย … คุณสมชายไม่สามารถเพิ่มงานได้ เนื่องจากไม่มีสิทธิ์แก้ไขข้อมูล + แสดง 3 งานที่มี
         Audit: getTasks ok=true            งานที่เหลือ: t1, t2, t3
editor : งาน “ซื้อกาแฟ” ถูกเพิ่มเรียบร้อยแล้ว
         Audit: createTask({"title":"ซื้อกาแฟ"}) ok=true       งานที่เหลือ: t1, t2, t3, t5
admin approve : ⏸ รออนุมัติ: deleteTask {"id":"t2"} → 👤 approve → งาน t2 ถูกลบเรียบร้อย
         Audit: deleteTask({"id":"t2"}) ok=true                งานที่เหลือ: t1, t3
admin reject  : ⏸ รออนุมัติ: deleteTask {"id":"t1"} → 👤 reject → ไม่สามารถลบได้เพราะยังไม่ได้รับอนุมัติ
         Audit: (ว่าง — ไม่มี tool ถูกรัน)                      งานที่เหลือ: t1, t2, t3
```

## Acceptance Criteria
- [ ] viewer เพิ่ม/แก้/ลบไม่ได้ และ audit ของความพยายามนั้นเป็น `ok=false` (เทสต์: "viewer cannot create a task")
- [ ] admin สั่งลบแล้ว agent หยุด งานยังอยู่ จนกว่าจะ approve; reject แล้วงานยังอยู่
- [ ] resume ด้วย approve ซ้ำสองครั้งลบครั้งเดียว (ดู `tests/part17-hitl.test.ts`)
- [ ] ถอนสิทธิ์ระหว่างรออนุมัติแล้ว approve → ไม่ลบ (`recheck`)
- [ ] script ที่เรียก tool วนไม่รู้จบหยุดที่ limit 6 พร้อมข้อความ "Tool call limit reached"
- [ ] `pnpm test tests/part17-workshop.test.ts` ผ่าน
- [ ] อธิบายได้ว่าทำไมต้องมี authorization ที่ backend ด้วย แม้มี middleware แล้ว

เฉลย: [`solution/task-agent.ts`](solution/task-agent.ts)
