// 13-04: Load CSV File
// แนวคิด: CSVLoader แปลง "1 แถว = 1 Document" (แต่ละฟิลด์เป็นบรรทัด `หัวคอลัมน์: ค่า`) และใส่ metadata.line
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";

const docs = await new CSVLoader("data/curriculum/fees.csv").load();
console.log("จำนวน Document:", docs.length, "(5 แถวข้อมูล)");
console.log("--- Document แรก ---\n" + docs[0].pageContent);
console.log("metadata:", docs[0].metadata);
