// 13-03: Load JSON File
// แนวคิด: JSONLoader ดึงเฉพาะส่วนที่เป็นข้อความจาก JSON (ไม่ใส่ pointer = ทุก string) — ใช้ JSON pointer เลือกฟิลด์ได้
import { JSONLoader } from "@langchain/classic/document_loaders/fs/json";

const all = await new JSONLoader("data/curriculum/schedule.json").load();
console.log("ทุก string:", all.length, "Document");
console.log(all.slice(0, 3).map((d) => d.pageContent));

const days = await new JSONLoader("data/curriculum/schedule.json", ["/periods/0/day", "/periods/1/day"]).load();
console.log("\nเลือกเฉพาะ pointer:", days.map((d) => d.pageContent), "| metadata[0]:", days[0].metadata);
