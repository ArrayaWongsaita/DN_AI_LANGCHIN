# Workshop 06 — AI Product Extractor

> **เริ่มทำ:** เปิดโครงให้เติมที่ [`starter/`](starter/) (มี `TODO` บอกทีละจุด) — ทำเองก่อน แล้วค่อยเทียบ [`solution/`](solution/)

## โจทย์
รับข้อความสินค้าภาษาไทย เช่น `เสื้อสีดำราคา 350 บาท มีไซซ์ M และ L` แล้วแปลงเป็น object ที่ประกอบด้วย `name, price, color, sizes, category`

## Requirements
1. เขียน `productSchema` ด้วย Zod (`category` เป็น enum: clothing, electronics, food, home, other) พร้อม `.describe()` ทุก field
2. ใช้ `withStructuredOutput()` (ปิด thinking เมื่อใช้ DeepSeek)
3. มี `validateBusinessRules()`: ราคา > 0, เสื้อผ้าต้องมีอย่างน้อย 1 ไซซ์, ไซซ์ไม่ซ้ำ/ไม่ว่าง
4. สินค้าที่ไม่ระบุไซซ์ (เช่น แก้วน้ำ) ต้องได้ `sizes: []` — **ห้ามแต่งไซซ์**
5. retry สูงสุด 3 ครั้ง โดยบอก model ว่าผิดตรงไหน; ถ้าไม่สำเร็จให้ throw
6. มี unit test (ไม่เรียก LLM) สำหรับ schema และ business rules

## วิธีรัน
```bash
pnpm exec tsx --env-file=.env workshops/part-06/solution/product-extractor.ts "เสื้อสีดำราคา 350 บาท มีไซซ์ M และ L"            # TokenMe (ค่าเริ่มต้น)
pnpm exec tsx --env-file=.env workshops/part-06/solution/product-extractor.ts "เสื้อสีดำราคา 350 บาท มีไซซ์ M และ L" deepseek   # DeepSeek
pnpm test tests/part06-schemas.test.ts
```

## Expected Output (ตัวอย่าง)
```
{ name: 'เสื้อ', price: 350, color: 'ดำ', sizes: [ 'M', 'L' ], category: 'clothing' }
{ name: 'แก้วน้ำสแตนเลส', price: 120, color: 'เงิน', sizes: [], category: 'other' }      ← "แก้วน้ำสแตนเลสสีเงิน 120 บาท"
{ name: 'ข้าวกล้องหอมมะลิ', price: 89, color: 'ขาว', sizes: [], category: 'food' }        ← "ข้าวกล้องหอมมะลิสีขาว 89 บาท ถุงละ 1 กก."
```

## Acceptance Criteria
- [ ] ข้อความตัวอย่างหลักได้ object ตรงตาม schema (`price` เป็น number, `sizes` = `['M','L']`)
- [ ] สินค้าที่ไม่มีไซซ์ได้ `sizes: []`
- [ ] `pnpm test tests/part06-schemas.test.ts` ผ่าน (รวมกรณีราคา 0, ไซซ์ซ้ำ/ว่าง, เสื้อผ้าไม่มีไซซ์)
- [ ] ใช้ได้ทั้ง TokenMe, Groq และ DeepSeek (ทดสอบสลับ provider)
- [ ] output ผิดรูปแบบถูกจัดการ (retry/throw) ไม่ใช่ crash เงียบๆ

> หมายเหตุจากการทดสอบจริง: ตอนแรก schema บังคับ `sizes` ไม่ว่าง ทำให้ model **แต่งไซซ์** (`['S']`) ให้สินค้าที่ไม่มีไซซ์ — แก้โดยอนุญาต array ว่างและบังคับไซซ์เฉพาะเสื้อผ้า

เฉลย: [`solution/product-schema.ts`](solution/product-schema.ts), [`solution/product-extractor.ts`](solution/product-extractor.ts)
