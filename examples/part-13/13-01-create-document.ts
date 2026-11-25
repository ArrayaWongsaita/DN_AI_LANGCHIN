// 13-01: Create Document
// แนวคิด: Document = pageContent (ข้อความ) + metadata (ที่มา/หมวด/หน้า) — หน่วยพื้นฐานที่ RAG ใช้ทั้งหมด
import { Document } from "@langchain/core/documents";

const doc = new Document({
  pageContent: "วิชาคณิตศาสตร์ ม.1 เรียนสัปดาห์ละ 4 คาบ คาบละ 50 นาที",
  metadata: { source: "math-m1.md", subject: "คณิตศาสตร์", grade: 1 },
});

console.log("pageContent:", doc.pageContent);
console.log("metadata   :", doc.metadata);
console.log("ความยาว    :", doc.pageContent.length, "ตัวอักษร");
// metadata ไม่ถูกส่งให้โมเดลเอง — เราเลือกเองว่าจะเอาอะไรไปใส่ใน prompt (เช่น ชื่อแหล่งที่มาไว้อ้างอิง)
