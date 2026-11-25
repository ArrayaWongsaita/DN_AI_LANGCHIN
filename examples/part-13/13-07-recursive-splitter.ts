// 13-07: RecursiveCharacterTextSplitter
// แนวคิด: ลองตัวคั่นตามลำดับ ("\n\n" → "\n" → " " → "") จนชิ้นไม่เกิน chunkSize — คงย่อหน้า/ประโยคไว้มากที่สุด; ตัวเลือกเริ่มต้นที่แนะนำ
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";

const [doc] = await new TextLoader("data/curriculum/science-m1.txt").load();
const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 400, chunkOverlap: 50, separators: ["\n\n", "\n", " ", ""] });
const chunks = await splitter.splitDocuments([doc]);
console.log(`${doc.pageContent.length} ตัวอักษร → ${chunks.length} chunk:`, chunks.map((c) => c.pageContent.length));
console.log("\n--- chunk 1 (ต้นๆ) ---\n" + chunks[1].pageContent.slice(0, 120) + "…");
console.log("metadata ของ chunk:", chunks[1].metadata.loc);

// ข้อความไทยไม่มีช่องว่าง: ตัวคั่นสุดท้าย "" ตัดตามขนาดได้เสมอ (ไม่ค้าง ไม่เกิน chunkSize)
const noSpace = new Document({ pageContent: "ก".repeat(900), metadata: {} });
const ok = await new RecursiveCharacterTextSplitter({ chunkSize: 300, chunkOverlap: 30, separators: ["\n\n", "\n", " ", ""] }).splitDocuments([noSpace]);
console.log(`\nข้อความ 900 ตัวอักษรไม่มีช่องว่าง → ${ok.length} chunk ยาวสูงสุด ${Math.max(...ok.map((c) => c.pageContent.length))}`);
