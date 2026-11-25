import pg from "pg";
import { requireEnv } from "./env.js";

/** สร้าง connection pool จาก DATABASE_URL (ห้ามลืม pool.end() — ใช้ withDb จะปิดให้เอง) */
export function createPool(): pg.Pool {
  const pool = new pg.Pool({ connectionString: requireEnv("DATABASE_URL") });
  pool.on("error", () => {}); // connection ที่ idle หลุด ไม่ควรทำให้โปรเซสล้ม
  return pool;
}

/** รันงานกับฐานข้อมูล แล้วปิด pool เสมอ; ถ้าต่อไม่ได้จะบอกวิธีแก้แทน ECONNREFUSED ดิบๆ */
export async function withDb<T>(fn: (pool: pg.Pool) => Promise<T>): Promise<T> {
  const pool = createPool();
  try {
    try {
      await pool.query("select 1");
    } catch (err) {
      throw new Error(
        `เชื่อมต่อ PostgreSQL ไม่ได้ (${(err as Error).message || (err as { code?: string }).code}) — รัน "docker compose up -d" แล้วตรวจ DATABASE_URL ใน .env`,
      );
    }
    return await fn(pool);
  } finally {
    await pool.end();
  }
}
