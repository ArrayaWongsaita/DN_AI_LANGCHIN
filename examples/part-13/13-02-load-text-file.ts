// 13-02: Load Text File
// แนวคิด: TextLoader อ่านไฟล์ .txt/.md เป็น Document 1 ชิ้นต่อไฟล์ (metadata.source = path ที่โหลด)
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";

const docs = await new TextLoader("data/curriculum/science-m1.txt").load();
console.log("จำนวน Document:", docs.length);
console.log("metadata:", docs[0].metadata);
console.log("ยาว:", docs[0].pageContent.length, "ตัวอักษร");
console.log("--- 150 ตัวอักษรแรก ---\n" + docs[0].pageContent.slice(0, 150));
