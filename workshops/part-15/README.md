# Workshop 15 — Persistent Lesson Search (PostgreSQL + pgvector)

> **เริ่มทำ:** เปิดโครงให้เติมที่ [`starter/`](starter/) (มี `TODO` บอกทีละจุด) — ทำเองก่อน แล้วค่อยเทียบ [`solution/`](solution/)

## โจทย์
ค้นหาบทเรียนใน `data/lessons.json` ตามความหมาย โดย **index ครั้งเดียว** เก็บใน pgvector แล้วค้นได้ในการรันครั้งต่อๆ ไป (คนละโปรเซส) ไม่ต้อง embed ใหม่

## Requirements
1. `index [--reset]` — upsert บทเรียนทั้งหมด (id คงที่) แล้วรายงานจำนวนแถวและจำนวนข้อความที่ส่งไป embed
2. `search "คำค้น" [--subject math] [--top-k 3]` — แสดงอันดับพร้อม similarity; กรองวิชาได้; ไม่พบ → บอกว่าไม่พบ
3. index ซ้ำต้องไม่เพิ่มแถวและไม่เรียก embedding (idempotent)
4. Docker/Postgres ไม่ได้รัน → ข้อความที่บอกวิธีแก้ ไม่ใช่ stack trace
5. `topK <= 0` ถูกปฏิเสธ; คำค้นว่าง → ผลว่าง
6. ฟังก์ชัน `indexLessons` / `searchLessons` ทดสอบได้ด้วย fake embeddings

## วิธีรัน
```bash
docker compose up -d --wait
A=workshops/part-15/solution/lesson-search.ts
pnpm exec tsx --env-file=.env $A index --reset      # ครั้งแรก
pnpm exec tsx --env-file=.env $A index              # ครั้งที่สอง (โปรเซสใหม่)
pnpm exec tsx --env-file=.env $A search "วิธีหาค่า x ในสมการ" --top-k 3
pnpm exec tsx --env-file=.env $A search "พลังงานจากธรรมชาติ" --subject science --top-k 2
pnpm test tests/part15-stores.test.ts
```

## Expected Output (จากการรันจริง — แต่ละคำสั่งเป็นโปรเซสแยก)
```
index เสร็จ: 18 แถวในตาราง | ส่งไป embed รอบนี้: 18 ข้อความ      ← index --reset
index เสร็จ: 18 แถวในตาราง | ส่งไป embed รอบนี้: 0 ข้อความ       ← index (ซ้ำ)

คำค้น: "วิธีหาค่า x ในสมการ"
1. [math ม.1] สมการเชิงเส้นตัวแปรเดียว ตอนที่ 3  (m1-05, similarity 0.712)
2. [math ม.1] สมการเชิงเส้นตัวแปรเดียว ตอนที่ 1  (m1-03, similarity 0.709)
3. [math ม.1] สมการเชิงเส้นตัวแปรเดียว ตอนที่ 2  (m1-04, similarity 0.709)

คำค้น: "พลังงานจากธรรมชาติ" (วิชา science)
1. [science ม.1] พลังงานรอบตัวและพลังงานทดแทน  (s1-04, similarity 0.708)
2. [science ม.1] แรงและการเคลื่อนที่  (s1-03, similarity 0.629)

คำค้น: "สมการ" (วิชา history) → (ไม่พบบทเรียนที่เกี่ยวข้อง)
(Docker หยุด) ❌ เชื่อมต่อ PostgreSQL ไม่ได้ (ECONNREFUSED) — รัน "docker compose up -d" แล้วตรวจ DATABASE_URL ใน .env
```

## Acceptance Criteria
- [ ] index ครั้งที่สองบอก `embed 0 ข้อความ` และจำนวนแถวไม่เปลี่ยน (18)
- [ ] ค้นในโปรเซสใหม่ได้ผลโดยไม่ต้อง index ใหม่
- [ ] `--subject` กรองได้; วิชาที่ไม่มี → ผลว่าง
- [ ] ปิด Docker แล้วได้ข้อความ error ที่แนะนำ `docker compose up -d`
- [ ] `pnpm test tests/part15-stores.test.ts` ผ่าน — เมื่อ Docker เปิดต้องไม่มีเทสต์ `skipped`
- [ ] อธิบายได้ว่าทำไมชุดข้อมูล 18 แถวนี้ไม่ต้องสร้าง HNSW/IVFFlat

เฉลย: [`solution/lesson-search.ts`](solution/lesson-search.ts) · store: [`src/rag/pg-store.ts`](../../src/rag/pg-store.ts)
