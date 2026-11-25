# Workshop 04 — CLI Chatbot ที่จำบทสนทนาได้

> **เริ่มทำ:** เปิดโครงให้เติมที่ [`starter/`](starter/) (มี `TODO` บอกทีละจุด) — ทำเองก่อน แล้วค่อยเทียบ [`solution/`](solution/)

## โจทย์
สร้างแชตบอตใน Terminal ที่คุยต่อเนื่องได้ และจดจำข้อมูลจากข้อความก่อนหน้า

## Requirements
1. เก็บประวัติเป็น `BaseMessage[]` และส่งทั้งก้อนทุกรอบ (มี `SystemMessage` กำหนดบุคลิก)
2. คำสั่ง `/reset` (ล้างประวัติ), `/history` (แสดงประวัติ), `/exit` (ออก)
3. ตัดประวัติเมื่อยาวเกิน 20 ข้อความ โดยคง system และเริ่มที่ human
4. ถ้า turn ใดเรียก API ล้มเหลว ให้แจ้ง error แล้วคุยต่อได้ (ไม่เก็บข้อความที่ล้มเหลวไว้ในประวัติ)
5. จบโปรแกรมได้เมื่อ stdin ปิด (Ctrl+D) โดยไม่ error
6. แสดง token รวมที่ใช้ตอนจบ

## วิธีรัน
```bash
pnpm exec tsx --env-file=.env workshops/part-04/solution/chatbot.ts
# ทดสอบแบบจำลองการพิมพ์
printf 'ฉันชื่อสมชาย ชอบแมว\nฉันชอบสัตว์อะไร\n/history\n/exit\n' | pnpm exec tsx --env-file=.env workshops/part-04/solution/chatbot.ts
```

## Expected Output (ตัวอย่าง)
```
CLI Chatbot — /history /reset /exit
คุณ > AI  > สวัสดีครับ สมชาย! ยินดีที่ได้รู้จักนะครับ ผมจะจำว่าคุณชอบแมวดีแล้ว 😊
AI  > คุณชอบแมวครับ 🐱
(ประวัติ 4 ข้อความ)
  [human] ฉันชื่อสมชาย ชอบแมว
  [ai] สวัสดีครับ สมชาย! …
  [human] ฉันชอบสัตว์อะไร
  [ai] คุณชอบแมวครับ 🐱

จบการสนทนา — ใช้ token รวม 374
```

## Acceptance Criteria
- [ ] ถามย้อนเรื่องที่เล่าไปก่อนหน้าแล้วตอบถูก
- [ ] หลัง `/reset` บอตไม่รู้เรื่องเดิม
- [ ] ใส่ `TOKENME_API_KEY=bad` แล้วบอตแจ้ง error ทุก turn แต่ไม่ crash และออกด้วย `/exit` ได้
- [ ] ภาษาไทยแสดงผลถูกต้องทั้งขาเข้าและขาออก
- [ ] `pnpm typecheck` ผ่าน

เฉลย: [`solution/chatbot.ts`](solution/chatbot.ts)
