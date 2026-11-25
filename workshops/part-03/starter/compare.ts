// Workshop 03 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
// รัน: pnpm exec tsx --env-file=.env workshops/part-03/starter/compare.ts
import { createChatModel, type ChatModelOptions } from "../../../src/models/index.js";
import { messageText } from "../../../src/utils/text.js";

const prompt = "แนะนำ 3 เคล็ดลับการเรียนเขียนโปรแกรมสำหรับมือใหม่ ข้อละไม่เกิน 1 ประโยค";

// TODO 1: กำหนด candidates อย่างน้อย 3 แบบ (เปลี่ยน temperature / model / provider)
const candidates: { label: string; options: ChatModelOptions }[] = [];

// TODO 2: วนทุก candidate → createChatModel → จับเวลา model.invoke(prompt) → เก็บ token จาก r.usage_metadata
// TODO 3: ครอบ try/catch ต่อรายการ (provider ที่ไม่มี key ต้องถูกข้าม ไม่ล้มทั้งโปรแกรม)
// TODO 4: console.table สรุป config / เวลา / token แล้วแสดงคำตอบของแต่ละ config
void [createChatModel, messageText, prompt, candidates];
