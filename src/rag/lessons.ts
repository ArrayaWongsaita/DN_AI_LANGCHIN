import { readFileSync } from "node:fs";
import { Document } from "@langchain/core/documents";

export interface Lesson {
  id: string;
  title: string;
  subject: string;
  grade: number;
  text: string;
}

export function loadLessons(path = "data/lessons.json"): Lesson[] {
  return JSON.parse(readFileSync(path, "utf8")) as Lesson[];
}

/** บทเรียน → Document (pageContent = ชื่อ + เนื้อหา; metadata: id, source=lesson:<id>, chunkIndex=0, subject, grade, title) */
export function lessonDocuments(lessons: Lesson[] = loadLessons()): Document[] {
  return lessons.map(
    (l) =>
      new Document({
        pageContent: `${l.title}\n${l.text}`,
        metadata: { id: l.id, source: `lesson:${l.id}`, chunkIndex: 0, subject: l.subject, grade: l.grade, title: l.title },
      }),
  );
}
