// ตัวช่วยของตัวอย่าง Part 15 (ไม่ใช่ตัวอย่าง — ขึ้นต้นด้วย _ จึงไม่อยู่ใน `pnpm play`)
import type { Document } from "@langchain/core/documents";
import { lessonDocuments, loadLessons } from "../../src/rag/lessons.js";

export { countingEmbeddings } from "../../src/embeddings/counting.js";

/** Document ของบทเรียน (ส่ง limit เพื่อเอาแค่ N รายการแรก) */
export async function loadLessonDocs(limit?: number): Promise<Document[]> {
  return lessonDocuments(loadLessons().slice(0, limit));
}
