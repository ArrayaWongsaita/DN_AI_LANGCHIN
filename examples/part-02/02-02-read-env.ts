// 02-02: Read Environment Variables
// แนวคิด: API key ต้องอยู่ใน .env ไม่ใช่ในโค้ด; pnpm play โหลด .env ให้อัตโนมัติ
// ข้อควรระวัง: ห้าม console.log ค่า key จริง — พิมพ์แค่ว่า "มี/ไม่มี" และความยาว
import { requireEnv } from "../../src/utils/env.js";

const keyNames = ["GROQ_API_KEY", "DEEPSEEK_API_KEY", "GOOGLE_API_KEY"];

for (const name of keyNames) {
  const value = process.env[name];
  // อ่านจาก process.env — ถ้าไม่ได้ตั้งค่าจะเป็น undefined
  console.log(`${name}: ${value ? `ตั้งค่าแล้ว (ยาว ${value.length} ตัวอักษร)` : "ยังไม่ได้ตั้งค่า"}`);
}

// requireEnv: ถ้าไม่มีค่า จะ throw error ที่บอกชื่อตัวแปรชัดเจน
const groqKey = requireEnv("GROQ_API_KEY");
console.log(`\nrequireEnv('GROQ_API_KEY') ผ่าน — ได้ค่ามาแล้ว (ไม่แสดงค่า, ยาว ${groqKey.length} ตัวอักษร)`);
