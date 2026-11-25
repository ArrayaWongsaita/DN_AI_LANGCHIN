# Workshop 07 — AI Content Processor

> **เริ่มทำ:** เปิดโครงให้เติมที่ [`starter/`](starter/) (มี `TODO` บอกทีละจุด) — ทำเองก่อน แล้วค่อยเทียบ [`solution/`](solution/)

## โจทย์
รับบทความ แล้วสร้างผลลัพธ์: **Summary, Keywords, Sentiment, Suggested Title** ด้วย pipeline ที่ประกอบจาก Runnable

## Requirements
1. ฟังก์ชัน `buildContentProcessor(model)` คืน Runnable: `{ article } → { summary, keywords: string[], sentiment: "positive"|"neutral"|"negative", title }`
2. 4 งานทำงานขนานด้วย `RunnableParallel` หลังขั้น validate
3. `article` ว่าง → throw error `article ว่าง` **ก่อนเรียก model**
4. `keywords` ต้องตัดช่องว่างและไม่ซ้ำ; `sentiment` ที่ model ตอบไม่ตรงค่าที่อนุญาต → `neutral`
5. ข้อความบทความอยู่ในแท็ก `<article>` และ prompt บอกให้ถือเป็นข้อมูล
6. มี unit test ที่ใช้ model ปลอม (ไม่เรียก LLM)

## วิธีรัน
```bash
pnpm exec tsx --env-file=.env workshops/part-07/solution/content-processor.ts "ร้านกาแฟเล็กๆ ในเชียงใหม่ใช้เมล็ดกาแฟจากเกษตรกรบนดอยโดยตรง …"
pnpm test tests/part07-pipeline.test.ts
```

## Expected Output (ตัวอย่าง)
```
{
  sentiment: 'positive',
  keywords: [ 'เชียงใหม่', 'กาแฟดอย', 'รายได้เกษตรกร', 'การขยายธุรกิจ', 'ชุมชนชาวบ้าน' ],
  summary: 'ร้านกาแฟเล็ก ๆ ในเชียงใหม่ใช้เมล็ดกาแฟจากเกษตรกรบนดอยโดยตรง …',
  title: 'กาแฟเชียงใหม่: การเชื่อมต่อเกษตรกรและลูกค้าเพื่อรายได้เพิ่มขึ้น 30%'
}
```
บทความเชิงลบ ("ระบบชำระเงินล่มสามวัน ลูกค้าโกรธ…") ได้ `sentiment: 'negative'`

## Acceptance Criteria
- [ ] ได้ครบ 4 field และชนิดข้อมูลถูกต้อง
- [ ] บทความเชิงบวก/ลบได้ sentiment ตรงกับความรู้สึก
- [ ] input ว่างถูกปฏิเสธด้วยข้อความชัดเจน
- [ ] `pnpm test tests/part07-pipeline.test.ts` ผ่าน (4 กรณี)
- [ ] สลับ provider ได้โดยไม่แก้ pipeline (แค่ส่ง model อื่น)

เฉลย: [`solution/content-processor.ts`](solution/content-processor.ts)
