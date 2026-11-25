# Workshop 09 — AI Assistant with Tools

> **เริ่มทำ:** เปิดโครงให้เติมที่ [`starter/`](starter/) (มี `TODO` บอกทีละจุด) — ทำเองก่อน แล้วค่อยเทียบ [`solution/`](solution/)

## โจทย์
สร้างผู้ช่วยที่มี 6 tools: `add`, `subtract`, `multiply`, `getWeather`, `searchProduct`, `getCurrentDate` (ข้อมูลอากาศ/สินค้าเป็น mock ใน `src/data/products.ts` และ `src/tools/index.ts`)
โมเดลต้องเลือก tool เอง รันผ่านโค้ดของเรา และสรุปคำตอบ **1 รอบของ tool calling**

## Requirements
1. ทุก tool สร้างด้วย `tool()` + Zod schema พร้อม description ภาษาไทยที่ต่างกันชัดเจน
2. `executeToolCalls(tools, aiMessage)` คืน `ToolMessage` ครบทุก call (id ตรง, เรียงตามเดิม) และไม่ throw
3. tool ไม่พบ / args ผิด / tool พัง → `status: "error"` ที่โมเดลอ่านเข้าใจ
4. เมืองที่ไม่มีข้อมูล → ข้อความที่บอกว่ามีเมืองอะไรบ้าง ไม่ใช่ข้อผิดพลาดของโปรแกรม
5. unit test ไม่เรียก LLM (`tests/part09-tools.test.ts`)

## วิธีรัน
```bash
pnpm exec tsx --env-file=.env workshops/part-09/solution/assistant.ts "อากาศที่ภูเก็ตเป็นอย่างไร และ keyboard ราคาเท่าไร" [groq|deepseek]
pnpm test tests/part09-tools.test.ts
```

## Expected Output (ตัวอย่าง — LLM ไม่ได้ตอบเหมือนเดิมทุกครั้ง; ตรวจบน Groq และ DeepSeek)
```
[deepseek] อากาศที่ภูเก็ตเป็นอย่างไร และ keyboard ราคาเท่าไร
tools: getWeather, searchProduct
- ภูเก็ต: ฝนตกเล็กน้อย 30°C
- Mechanical Keyboard: 2,490 บาท (เหลือ 3 ชิ้น)

[groq] อากาศที่ Atlantis เป็นอย่างไร
tools: getWeather
ขออภัย ไม่พบข้อมูลอากาศของ "Atlantis" (เมืองที่รองรับคือ กรุงเทพ, เชียงใหม่, ภูเก็ต)

[groq] สวัสดี คุณทำอะไรได้บ้าง
tools: (ไม่ใช้)
สวัสดีครับ/ค่ะ! ผมช่วยคำนวณ, ตรวจสอบอากาศ, ค้นหาสินค้า, หรือดูวันที่ปัจจุบันได้ครับ.
```

### ข้อจำกัดของ 1 รอบ (ตั้งใจให้เห็น — Part 10 แก้)
คำถามที่ต้องใช้ tool **ต่อเนื่อง** เช่น "15 บวก 27 แล้วคูณ 3" หรือถามสองเรื่องพร้อมกัน อาจจบด้วย `(โมเดลไม่ตอบหลังได้ผล tool)` เพราะโมเดลขอ tool เพิ่มหลังรอบแรก:
```
[groq] อากาศที่ภูเก็ตเป็นอย่างไร และ keyboard ราคาเท่าไร
tools: getWeather
(โมเดลไม่ตอบหลังได้ผล tool)
[deepseek] 15 บวก 27 แล้วคูณ 3 ได้เท่าไร
tools: add
(โมเดลไม่ตอบหลังได้ผล tool)
```

## Acceptance Criteria
- [ ] คำถามอากาศ/สินค้า/คำนวณ/วันที่ ถูกส่งไปยัง tool ที่ถูกต้อง (ตรวจจากบรรทัด `tools:`)
- [ ] เมืองที่ไม่มีข้อมูลได้คำตอบที่สุภาพ ไม่ crash
- [ ] คำถามทั่วไป ("สวัสดี") ไม่เรียก tool
- [ ] `pnpm test tests/part09-tools.test.ts` ผ่าน (ครอบคลุม tool ไม่พบ, args ผิด, tool พัง, ไม่มี tool call)
- [ ] ใช้ได้ทั้ง Groq และ DeepSeek (`thinking:false`)
- [ ] อธิบายได้ว่าทำไมคำถามที่ต้องใช้ tool ต่อเนื่องจึงต้องมี loop

เฉลย: [`solution/assistant.ts`](solution/assistant.ts) · ตัวช่วย: [`src/agents/execute-tools.ts`](../../src/agents/execute-tools.ts), [`src/tools/index.ts`](../../src/tools/index.ts)
