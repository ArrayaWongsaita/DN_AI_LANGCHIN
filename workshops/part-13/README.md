# Workshop 13 — Document Processing Pipeline

> **เริ่มทำ:** เปิดโครงให้เติมที่ [`starter/`](starter/) (มี `TODO` บอกทีละจุด) — ทำเองก่อน แล้วค่อยเทียบ [`solution/`](solution/)

## โจทย์
สร้าง pipeline ที่ **โหลดเอกสารทุกชนิดใน `data/curriculum/` → ทำความสะอาด → แบ่ง chunk → แสดงสถิติต่อไฟล์** โดยทุก chunk ย้อนกลับไปหาไฟล์ต้นทางได้ และไฟล์ที่มีปัญหาไม่ทำให้ทั้งงานล้ม

## Requirements
1. ใช้ `loadCurriculum(dir)` (รองรับ txt/md/json/csv/pdf; ข้ามไฟล์ว่าง/ไม่รองรับ/เสียพร้อม warning)
2. `cleanText(text)`: ตัด control character, ยุบช่องว่าง/tab, จำกัดบรรทัดว่างติดกันไม่เกิน 1 บรรทัด
3. `processDocuments(dir, { chunkSize, chunkOverlap })` คืน `{ chunks, stats, warnings }`
4. `stats` ต่อไฟล์: `source`, `type`, `documents`, `chunks`, `avgChunkLength`, `maxChunkLength`
5. ทุก chunk มี `metadata.source`, `type`, `chunkIndex`; ไม่มี chunk ยาวเกิน `chunkSize`
6. ไม่เรียก LLM — ทดสอบได้ด้วย unit test

## วิธีรัน
```bash
pnpm exec tsx workshops/part-13/solution/process-documents.ts            # โฟลเดอร์เริ่มต้น data/curriculum
pnpm test tests/part13-documents.test.ts
```

## Expected Output (จากการรันจริง, chunkSize 500 / overlap 50)
```
 source                  type   documents  chunks  avgChunkLength  maxChunkLength
 activities.md           md     1          2       436             454
 fees.csv                csv    5          5       110             117
 handbook-extract.txt    txt    1          1       469             469
 handbook.pdf            pdf    1          1       473             473
 math-m1.md              md     1          4       335             464
 schedule.json           json   29         29      10              38
 science-m1.txt          txt    1          4       304             368
 thai-m1.md              md     1          3       324             375
รวม 49 chunk จาก 8 ไฟล์ | warnings: ไม่มี
```

## Acceptance Criteria
- [ ] ครบ 8 ไฟล์ตัวอย่าง (5 ชนิด) และไม่มี warning กับข้อมูลชุดนี้
- [ ] ไฟล์ว่าง / `.png` / JSON เสีย ในโฟลเดอร์ทดสอบ → warning ไม่ใช่ exception
- [ ] ทุก chunk มี `source`; ผลรวม `chunks` ใน stats = จำนวน chunk ทั้งหมด
- [ ] `maxChunkLength ≤ chunkSize` ทุกไฟล์
- [ ] `pnpm test tests/part13-documents.test.ts` ผ่าน
- [ ] อธิบายได้ว่าทำไม `schedule.json` ได้ chunk เล็กมากและจะแก้อย่างไร

เฉลย: [`solution/process-documents.ts`](solution/process-documents.ts) · ตัวโหลด/ตัวแบ่ง: [`src/rag/load-curriculum.ts`](../../src/rag/load-curriculum.ts)
