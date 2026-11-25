# Workshop 10 — Shopping Agent Loop

> **เริ่มทำ:** เปิดโครงให้เติมที่ [`starter/`](starter/) (มี `TODO` บอกทีละจุด) — ทำเองก่อน แล้วค่อยเทียบ [`solution/`](solution/)

## โจทย์
เขียน agent ที่ใช้ loop ค้นสินค้า ตรวจราคา/จำนวนคงเหลือ และคำนวณยอดรวมด้วย tools หลายตัว (`searchProduct`, `add`, `multiply`) — ข้อมูลสินค้าเป็น mock ใน `src/data/products.ts`

## Requirements
1. ใช้ loop (`runAgentLoop` หรือเขียนเอง) ที่วนจนโมเดลไม่ขอ tool และมีเพดานรอบ
2. ใช้ tool คำนวณทุกครั้ง — ห้ามให้โมเดลคำนวณเอง (ผ่าน system prompt)
3. สินค้าไม่พบ / หมดสต็อก → แจ้งตรงๆ และไม่รวมยอดสินค้านั้น
4. แสดง log ว่ารอบไหนเรียก tool อะไร
5. ตรวจ `stopReason` — ไม่ใช่ `final` ให้ exit code ≠ 0
6. unit test ของ loop ด้วย scripted model (มีอยู่แล้วใน `tests/part10-agent-loop.test.ts`: ขนาน, tool ไม่พบ, ครบเพดาน, abort)

## วิธีรัน
```bash
pnpm exec tsx --env-file=.env workshops/part-10/solution/shopping-loop.ts "ซื้อ Mechanical Keyboard 2 ตัว และหูฟังบลูทูธ 1 ชิ้น รวมกี่บาท" [tokenme|groq|deepseek]
pnpm test tests/part10-agent-loop.test.ts
```

## Expected Output (ตัวอย่าง — LLM ไม่ได้ตอบเหมือนเดิมทุกครั้ง; บันทึกจาก Groq และ DeepSeek แล้วรันซ้ำบน TokenMe ผ่าน)
```
[groq] ซื้อ Mechanical Keyboard 2 ตัว และหูฟังบลูทูธ 1 ชิ้น รวมกี่บาท
  รอบ 1: searchProduct({"query":"Mechanical Keyboard"})
  รอบ 2: searchProduct({"query":"หูฟังบลูทูธ"})
  รอบ 3: multiply({"a":2490,"b":2})
  รอบ 4: add({"a":4980,"b":1290})
[final / 5 รอบ]
6270 บาทครับ

[deepseek] ซื้อ Monitor 27 นิ้ว 1 จอ ได้ไหม
  รอบ 1: searchProduct({"query":"Monitor 27 นิ้ว"})
[final / 2 รอบ]
ขออภัยครับ Monitor 27 นิ้วเหลือ 0 ชิ้น จึงสั่งซื้อไม่ได้ในขณะนี้

[groq] ซื้อ iPhone 1 เครื่อง รวมกี่บาท
[final / 2 รอบ]
ขออภัย ไม่พบสินค้า “iPhone” ในระบบครับ
```
(ยอด 6,270 = 2,490×2 + 1,290)

## Acceptance Criteria
- [ ] ยอดรวมของคำสั่งซื้อหลายสินค้าถูกต้อง (6,270 บาท)
- [ ] ใช้ tool คำนวณ (เห็น `multiply`/`add` ใน log)
- [ ] สินค้าหมด/ไม่พบ ถูกแจ้งโดยไม่เดาราคา
- [ ] ครบเพดานรอบแล้วโปรแกรมแจ้งว่าไม่สมบูรณ์ (exit code 2) ไม่ใช่แสดงคำตอบเหมือนสำเร็จ
- [ ] `pnpm test tests/part10-agent-loop.test.ts` ผ่าน
- [ ] ทำงานได้ทั้ง TokenMe, Groq และ DeepSeek

เฉลย: [`solution/shopping-loop.ts`](solution/shopping-loop.ts) · loop: [`src/agents/agent-loop.ts`](../../src/agents/agent-loop.ts)
