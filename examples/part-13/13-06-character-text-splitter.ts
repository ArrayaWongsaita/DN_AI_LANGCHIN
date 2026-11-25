// 13-06: CharacterTextSplitter
// แนวคิด: แบ่งด้วย "ตัวคั่นเดียว" (separator) แล้วรวมให้ไม่เกิน chunkSize — ง่าย แต่ถ้าไม่เจอตัวคั่นจะตัดไม่ได้
import { Document } from "@langchain/core/documents";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";

const [doc] = await new TextLoader("data/curriculum/science-m1.txt").load();
const splitter = new CharacterTextSplitter({ separator: "\n\n", chunkSize: 400, chunkOverlap: 0 });
const chunks = await splitter.splitDocuments([doc]);
console.log(`เอกสาร ${doc.pageContent.length} ตัวอักษร → ${chunks.length} chunk (แบ่งที่ย่อหน้า)`);
console.log(chunks.map((c) => c.pageContent.length));

// ข้อจำกัด: ข้อความไทยไม่มีช่องว่างคั่นคำ — ถ้าตัวคั่นเป็น " " จะไม่แบ่งเลย
const noSpace = new Document({ pageContent: "ก".repeat(900), metadata: {} });
const bad = await new CharacterTextSplitter({ separator: " ", chunkSize: 300, chunkOverlap: 0 }).splitDocuments([noSpace]);
console.log(`\nข้อความ 900 ตัวอักษรไม่มีช่องว่าง + separator " " → ${bad.length} chunk ยาว ${bad[0].pageContent.length} (เกิน chunkSize 300!)`);
