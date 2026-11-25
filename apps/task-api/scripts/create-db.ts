// สร้างฐานข้อมูลของ Task API ถ้ายังไม่มี (ใช้ครั้งแรก หรือหลัง `docker compose down -v`)
import pg from "pg";

const target = process.env.TASK_API_DATABASE_URL;
if (!target) {
  console.error("❌ ไม่พบ TASK_API_DATABASE_URL — ดู .env.example");
  process.exit(1);
}
const url = new URL(target);
const dbName = url.pathname.slice(1);
if (!/^[a-z0-9_]+$/.test(dbName)) {
  console.error("❌ ชื่อฐานข้อมูลต้องเป็น a-z 0-9 _ เท่านั้น");
  process.exit(1);
}
url.pathname = "/postgres"; // เชื่อมฐานหลักเพื่อสร้างฐานใหม่
const client = new pg.Client({ connectionString: url.toString() });
try {
  await client.connect();
} catch {
  console.error("❌ เชื่อมต่อ PostgreSQL ไม่ได้ — รัน `pnpm db:up` ที่ root แล้วตรวจ TASK_API_DATABASE_URL");
  process.exit(1);
}
const exists = await client.query("select 1 from pg_database where datname = $1", [dbName]);
if (exists.rowCount === 0) {
  await client.query(`create database ${dbName}`); // dbName ผ่าน regex แล้ว
  console.log(`สร้างฐานข้อมูล ${dbName} แล้ว — ต่อด้วย pnpm --filter task-api migrate`);
} else {
  console.log(`มีฐานข้อมูล ${dbName} อยู่แล้ว`);
}
await client.end();
