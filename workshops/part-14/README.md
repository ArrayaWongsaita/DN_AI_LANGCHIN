# Workshop 14 — Semantic Product Search

> **เริ่มทำ:** เปิดโครงให้เติมที่ [`starter/`](starter/) (มี `TODO` บอกทีละจุด) — ทำเองก่อน แล้วค่อยเทียบ [`solution/`](solution/)

## โจทย์
ค้นหาสินค้าด้วยความหมาย: คำค้นภาษาไทย "อุปกรณ์สำหรับเขียนโปรแกรม" ต้องพบ **Laptop, Mechanical Keyboard, Monitor** ใน top 3 ทั้งที่คำนั้นไม่ปรากฏในคำอธิบายสินค้า

## Requirements
1. ข้อมูล `src/data/semantic-products.ts` (14 รายการ ทั้งอุปกรณ์ไอทีและของไม่เกี่ยวข้อง)
2. ใช้ `semanticSearch` + Gemini embeddings (เอกสาร: `RETRIEVAL_DOCUMENT`, คำค้น: `RETRIEVAL_QUERY`)
3. CLI: `"คำค้น" [--top-k N] [--min-score X]` แสดงอันดับ + คะแนน cosine; ไม่พบ → บอกว่าไม่พบ
4. จัดการ error (ไม่มี key, โควตาเต็ม) ด้วยข้อความที่อ่านรู้เรื่อง + retry
5. ทดสอบ logic ด้วย stub/fake embeddings (ไม่เรียก API) — `pnpm test tests/part14-semantic.test.ts`

## วิธีรัน
```bash
A=workshops/part-14/solution/semantic-product-search.ts
pnpm exec tsx --env-file=.env $A "อุปกรณ์สำหรับเขียนโปรแกรม" --top-k 3
pnpm exec tsx --env-file=.env $A "รถยนต์ไฟฟ้ามือสอง" --min-score 0.6
```

## Expected Output (จากการรันจริงกับ Gemini)
```
คำค้น: "อุปกรณ์สำหรับเขียนโปรแกรม"
1. Mechanical Keyboard  (cosine 0.682)
2. Laptop  (cosine 0.681)
3. Monitor 27 นิ้ว  (cosine 0.678)

คำค้น: "ของขวัญสำหรับคนรักการออกกำลังกาย"   → 1. เสื่อโยคะ (0.688) 2. เสื้อยืดสีดำ (0.614) 3. ร่มพับกันฝน (0.607)
คำค้น: "มีอะไรช่วยให้ประชุมออนไลน์ได้บ้าง"     → 1. Webcam Full HD (0.726) 2. USB-C Hub (0.626) 3. Wireless Mouse (0.619)
คำค้น: "รถยนต์ไฟฟ้ามือสอง" --min-score 0.6    → (ไม่พบสินค้าที่เกี่ยวข้อง)
```

### ตัวอย่างที่ semantic search ตอบผิด (ต้องบันทึกไว้ในรายงาน)
```
คำค้น: "อุปกรณ์ที่ไม่ใช่คีย์บอร์ด"
1. Wireless Mouse (0.674)  2. USB-C Hub (0.671)  3. Mechanical Keyboard (0.669)   ← คีย์บอร์ดยังติดอันดับ
```
embedding จับ "หัวข้อ" (คีย์บอร์ด) แต่ไม่เข้าใจ "ไม่ใช่" — งานที่มีเงื่อนไข/การปฏิเสธต้องกรองด้วย metadata หรือโค้ด

## Acceptance Criteria
- [ ] Laptop, Mechanical Keyboard, Monitor อยู่ top 3 ของคำค้นหลัก (อนุญาตให้ลำดับสลับกันได้ — คะแนนต่างกันเพียง ~0.004)
- [ ] `--min-score 0.6` กับคำค้นนอกขอบเขตให้ผลว่าง
- [ ] ไม่ embed เอกสารซ้ำในการค้นหนึ่งครั้ง (1 batch + 1 query)
- [ ] หา "ตัวอย่างที่ semantic ตอบผิด" ของตัวเองอย่างน้อย 1 ตัวอย่าง พร้อมอธิบายสาเหตุ
- [ ] `pnpm test tests/part14-semantic.test.ts` ผ่าน
- [ ] อธิบายได้ว่าทำไม `minScore` ต้อง calibrate เอง

เฉลย: [`solution/semantic-product-search.ts`](solution/semantic-product-search.ts) · แกนค้นหา: [`src/rag/semantic-search.ts`](../../src/rag/semantic-search.ts)
