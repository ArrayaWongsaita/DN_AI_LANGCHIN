// Workshop 16 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
// รัน: pnpm exec tsx --env-file=.env workshops/part-16/starter/curriculum-assistant.ts "คำถาม"
import { createEmbeddings } from "../../../src/embeddings/index.js";
import { createChatModel } from "../../../src/models/index.js";
import { createCurriculumRetriever, indexCurriculum } from "../../../src/rag/curriculum-index.js";
import { answerWithRag } from "../../../src/rag/rag.js";
import { withDb } from "../../../src/utils/db.js";

// TODO 1: รับคำถามจาก argument (+ --provider, --reset) ถ้าไม่มีให้แสดงวิธีใช้
// TODO 2: withDb → indexCurriculum (idempotent) → createCurriculumRetriever → answerWithRag
// TODO 3: แสดงคำตอบ + แหล่งที่มา; คำถามนอกเรื่อง ต้องตอบ "ไม่พบข้อมูล" โดยไม่เรียก model (ดูเกณฑ์ใน README)
void [createEmbeddings, createChatModel, createCurriculumRetriever, indexCurriculum, answerWithRag, withDb];
console.log("TODO: เขียนโปรแกรมตามโจทย์");
