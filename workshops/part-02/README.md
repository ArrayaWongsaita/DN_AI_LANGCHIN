# Workshop 02 — AI Hello World

## โจทย์
สร้างโปรแกรม Terminal ที่ถามคำถามจากผู้ใช้ แล้วแสดงคำตอบจาก AI

## Requirements
1. ใช้ `initChatModel` กับ Groq `openai/gpt-oss-20b`
2. อ่านคำถามจาก Terminal (`node:readline/promises`)
3. อ่าน key จาก `.env` ผ่าน `requireEnv`
4. ถ้าเรียก AI ไม่สำเร็จ ต้องแสดงสาเหตุ (ไม่ crash ด้วย stack trace)
5. ถ้าไม่ได้พิมพ์คำถาม ให้แจ้งและจบโปรแกรมปกติ

## วิธีรัน
```bash
pnpm exec tsx --env-file=.env workshops/part-02/solution/hello-world.ts
# หรือจำลองการพิมพ์: echo "ประเทศไทยมีกี่จังหวัด" | pnpm exec tsx --env-file=.env workshops/part-02/solution/hello-world.ts
```

## Expected Output (ตัวอย่าง — คำตอบ AI อาจต่างกัน)
```
ถามอะไรดี? > ประเทศไทยมีกี่จังหวัด

AI: ประเทศไทยมี 77 จังหวัด …
```

## Acceptance Criteria
- [ ] ตอบคำถามภาษาไทยได้ถูกต้องและแสดงภาษาไทยไม่เพี้ยน
- [ ] กด Enter เปล่าๆ แล้วไม่ error
- [ ] ใส่ key ผิดแล้วเห็นข้อความ `❌ เรียก AI ไม่สำเร็จ (HTTP 401)`
- [ ] ไม่มี API key อยู่ในโค้ดหรือใน git
- [ ] `pnpm typecheck` ผ่าน

เฉลย: [`solution/hello-world.ts`](solution/hello-world.ts)
