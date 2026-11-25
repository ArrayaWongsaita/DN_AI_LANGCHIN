# Workshop 03 — เปรียบเทียบ Model และ Configuration

> **เริ่มทำ:** เปิดโครงให้เติมที่ [`starter/`](starter/) (มี `TODO` บอกทีละจุด) — ทำเองก่อน แล้วค่อยเทียบ [`solution/`](solution/)

## โจทย์
ส่ง prompt เดียวกันไปยัง model/config ที่ต่างกัน แล้วเปรียบเทียบ **คุณภาพ ความเร็ว และ token usage**

## Requirements
1. ทดสอบอย่างน้อย 4 ชุด: temperature ต่างกัน (0, 1), model ต่างกัน (deepseek-v4.1-flash, qwen3.8-27b), provider ต่างกัน (TokenMe, Groq, DeepSeek)
2. วัดเวลาด้วย `performance.now()` และอ่าน token จาก `usage_metadata`
3. แสดงผลเป็นตาราง (`console.table`) พร้อมคำตอบของแต่ละชุด
4. ถ้า provider ใดไม่มี key ให้ข้ามพร้อมข้อความ ไม่ crash
5. สร้าง `my-notes.md` ให้คะแนนคุณภาพ 1–5 (ถูกต้อง / ครบ / อ่านง่าย) และสรุป 3 บรรทัดว่าจะเลือกชุดไหนสำหรับงานใด

## วิธีรัน
```bash
pnpm exec tsx --env-file=.env workshops/part-03/solution/compare.ts
```

## Expected Output (ตัวอย่าง)
```
┌─────────┬───────────────────────────┬───────────┬───────┬────────┬───────┬────────┐
│ (index) │ config                    │ เวลา (ms) │ input │ output │ total │ finish │
├─────────┼───────────────────────────┼───────────┼───────┼────────┼───────┼────────┤
│ 0       │ 'tokenme v4.1-flash t=0'  │ 3122      │ 30    │ 103    │ 133   │ 'stop' │
│ 1       │ 'tokenme v4.1-flash t=1'  │ 4449      │ 30    │ 105    │ 135   │ 'stop' │
│ 2       │ 'tokenme qwen3.8-27b t=0' │ 5971      │ 30    │ 55     │ 85    │ 'stop' │
│ 3       │ 'groq gpt-oss-20b t=0'    │ 447       │ 101   │ 120    │ 221   │ 'stop' │
│ 4       │ 'deepseek-flash t=0'      │ 1697      │ 30    │ 105    │ 135   │ 'stop' │
└─────────┴───────────────────────────┴───────────┴───────┴────────┴───────┴────────┘
```

## Acceptance Criteria
- [ ] มีตารางเทียบอย่างน้อย 4 ชุด พร้อมเวลา/token/finish_reason
- [ ] ทุกชุดจบด้วย `finish_reason: stop` (ไม่ถูกตัด)
- [ ] ข้าม provider ที่ไม่มี key ได้โดยไม่ crash
- [ ] `my-notes.md` สรุปเหตุผลเลือก model ตามงาน (Cost/Latency/Quality)

เฉลย: [`solution/compare.ts`](solution/compare.ts)
