// 13-09: Preserve Metadata
// แนวคิด: ทุก chunk ต้องย้อนกลับไปหาไฟล์ต้นทางได้ (ไว้อ้างอิงแหล่งที่มาใน RAG และลบ/อัปเดตตามไฟล์ได้)
import { chunkDocuments, loadCurriculum } from "../../src/rag/load-curriculum.js";

const { documents, warnings } = await loadCurriculum();
const chunks = await chunkDocuments(documents, { chunkSize: 500, chunkOverlap: 50 });

console.log("warnings:", warnings.length ? warnings : "(ไม่มี)");
const bySource = new Map<string, number>();
for (const c of chunks) bySource.set(c.metadata.source, (bySource.get(c.metadata.source) ?? 0) + 1);
console.log("\nchunk ต่อไฟล์:");
for (const [src, n] of bySource) console.log(`  ${src.padEnd(22)} ${n}`);

const c = chunks.find((x) => x.metadata.source === "math-m1.md" && x.metadata.chunkIndex === 1)!;
console.log("\nตัวอย่าง chunk:", { source: c.metadata.source, type: c.metadata.type, chunkIndex: c.metadata.chunkIndex, loc: c.metadata.loc });
console.log("ทุก chunk มี source:", chunks.every((x) => typeof x.metadata.source === "string" && x.metadata.source));
