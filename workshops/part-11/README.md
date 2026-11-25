# Workshop 11 — AI Shopping Assistant

> **เริ่มทำ:** เปิดโครงให้เติมที่ [`starter/`](starter/) (มี `TODO` บอกทีละจุด) — ทำเองก่อน แล้วค่อยเทียบ [`solution/`](solution/)

## โจทย์
สร้างผู้ช่วยขายของด้วย `createAgent` ที่ค้นหาสินค้า ดูราคา ตรวจสต็อก เปรียบเทียบ คำนวณยอดรวม และ **ตอบเป็น object ตาม schema** (`items`, `total`, `note?`) — ข้อมูลเป็น mock ใน `src/data/products.ts`

## Requirements
1. Tools ใน `src/tools/shopping.ts`: `searchProducts`, `getPrice`, `checkStock`, `compareProducts` (≥ 2 ชื่อ), `calculateTotal` (จำนวนเต็ม ≥ 1, ตรวจสต็อก)
2. ชื่อสินค้ากำกวมหรือไม่พบ → error ที่บอกทางแก้ (ไม่เดา, ไม่คืน `NaN`)
3. `buildShoppingAgent(model)` ใช้ `createAgent` + `responseFormat: toolStrategy(schema)`
4. สินค้าหมด/ไม่พบ → ไม่ถูกนับในยอดรวม และมีเหตุผลใน `note`
5. ตั้ง `recursionLimit` และลองใหม่เฉพาะ error ชั่วคราว (`retryAsync`)
6. unit test ไม่เรียก LLM: tools (รวม edge case) + agent ด้วย scripted model

## วิธีรัน
```bash
pnpm exec tsx --env-file=.env workshops/part-11/solution/shopping-assistant.ts "ซื้อ Mechanical Keyboard 2 ตัว กับหูฟังบลูทูธ 1 ชิ้น รวมกี่บาท" [groq|deepseek]
pnpm test tests/part11-shopping.test.ts
```
> Groq free tier จำกัด 8,000 token/นาที — agent ใช้ token มาก ถ้าเจอ 429 ให้รอสักครู่หรือใช้ `deepseek`

## Expected Output (ตัวอย่าง — LLM ไม่ได้ตอบเหมือนเดิมทุกครั้ง; ตรวจบน Groq และ DeepSeek)
```
[groq] ซื้อ Mechanical Keyboard 2 ตัว กับหูฟังบลูทูธ 1 ชิ้น รวมกี่บาท
{ "items": [ { "name": "Mechanical Keyboard", "quantity": 2, "unitPrice": 2490 },
             { "name": "หูฟังบลูทูธ", "quantity": 1, "unitPrice": 1290 } ],
  "note": "All items found and in stock", "total": 6270 }

[deepseek] ขอ Monitor 27 นิ้ว 1 จอ กับกระติกน้ำสแตนเลส 2 ใบ
{ "items": [ { "name": "กระติกน้ำสแตนเลส", "quantity": 2, "unitPrice": 420 } ], "total": 840,
  "note": "Monitor 27 นิ้ว คงเหลือ 0 ชิ้น จึงไม่ถูกนำมาคิดในยอดรวม" }

[deepseek] เปรียบเทียบ Laptop กับ Mechanical Keyboard หน่อย แล้วขอ iPhone 1 เครื่อง
{ "items": [], "total": 0, "note": "ไม่พบสินค้า \"iPhone\" ในระบบ …" }
```

### สิ่งที่พบจริงระหว่างทดสอบ (ใช้ประกอบการสอน)
- Groq **แปลคำค้นภาษาไทยเป็นอังกฤษ** ("Bluetooth headset") แล้วไม่พบสินค้า → แก้ด้วย system prompt "ใช้ชื่อตามที่ผู้ใช้พิมพ์" และให้ tool บอกรายชื่อสินค้าที่มีเมื่อค้นไม่พบ
- Groq เรียก `getPrice`/`checkStock` ซ้ำๆ จนชน `recursionLimit` (12) → บอกใน prompt ว่า `calculateTotal` ตรวจให้แล้ว และเพิ่มเพดานเป็น 20
- Groq บางครั้งตอบ 400 (`output_parse_failed` / `tool_use_failed`) → `retryAsync`

## Acceptance Criteria
- [ ] ยอดรวมถูกต้อง (6,270 บาท สำหรับตัวอย่างหลัก) และ `typeof total === "number"`
- [ ] สินค้าหมด/ไม่พบไม่ถูกคิดเงินและมี `note`
- [ ] `pnpm test tests/part11-shopping.test.ts` ผ่าน (10 เทสต์: tool edge case + agent ผ่าน scripted model)
- [ ] ทำงานได้ทั้ง Groq และ DeepSeek
- [ ] อธิบายได้ว่าทำไมต้องตรวจ `structuredResponse` อีกครั้ง (โมเดลอาจใส่ตัวเลขผิด)

เฉลย: [`solution/shopping-assistant.ts`](solution/shopping-assistant.ts) · tools: [`src/tools/shopping.ts`](../../src/tools/shopping.ts)
