// 13-05: Load PDF File
// แนวคิด: PDFLoader แยกเป็น 1 หน้า = 1 Document และใส่ metadata (เลขหน้า, จำนวนหน้า)
// หมายเหตุ: PDF ตัวอย่างเป็นภาษาอังกฤษ เพราะเครื่องมือสร้าง PDF ในเครื่องไม่ฝังฟอนต์ไทย — PDF ภาษาไทยจริงใช้ได้ถ้าไฟล์มีข้อความ (ไม่ใช่ภาพสแกน)
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

const docs = await new PDFLoader("data/curriculum/handbook.pdf").load();
console.log("จำนวนหน้า/Document:", docs.length);
console.log("metadata.loc:", docs[0].metadata.loc, "| totalPages:", docs[0].metadata.pdf?.totalPages);
console.log("--- ข้อความ (200 ตัวอักษรแรก) ---\n" + docs[0].pageContent.slice(0, 200));
console.log("\n⚠ PDF ที่เป็นภาพสแกนจะได้ข้อความว่าง — ต้องใช้ OCR (นอกขอบเขตบทนี้)");
