// 13-08: Compare Chunk Sizes
// แนวคิด: chunk เล็ก = ตรงประเด็นแต่ขาดบริบท; chunk ใหญ่ = บริบทครบแต่ปนเรื่องอื่นและเปลือง token — ไม่มีค่ากลางที่ถูกเสมอ ต้องวัดกับข้อมูลจริง
import { chunkDocuments, loadCurriculum } from "../../src/rag/load-curriculum.js";

const all = (await loadCurriculum()).documents;
// เทียบเฉพาะเอกสารข้อความยาว (md/txt) — แถว CSV และ string ใน JSON เป็นชิ้นสั้นอยู่แล้ว จะบิดผลเปรียบเทียบ
const documents = all.filter((d) => d.metadata.type === "md" || d.metadata.type === "txt");
const total = documents.reduce((n, d) => n + d.pageContent.length, 0);
console.log(`เอกสาร md/txt ${documents.length} ไฟล์ รวม ${total} ตัวอักษร\n`);
// หมายเหตุ: overlap มีผลเมื่อตัวแบ่งตัดกลางย่อหน้า — เอกสารที่แบ่งย่อหน้าชัดจึงเห็นการซ้ำน้อย
console.log("chunkSize | overlap | chunks | เฉลี่ย | สั้นสุด | ยาวสุด");
for (const [chunkSize, chunkOverlap] of [[150, 15], [400, 40], [1000, 100]] as const) {
  const chunks = await chunkDocuments(documents, { chunkSize, chunkOverlap });
  const lens = chunks.map((c) => c.pageContent.length);
  const sum = lens.reduce((a, b) => a + b, 0);
  console.log(
    `${String(chunkSize).padStart(9)} | ${String(chunkOverlap).padStart(7)} | ${String(chunks.length).padStart(6)} | ${String(Math.round(sum / lens.length)).padStart(5)} | ${String(Math.min(...lens)).padStart(7)} | ${String(Math.max(...lens)).padStart(6)}`,
  );
}
