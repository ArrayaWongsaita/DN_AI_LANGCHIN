import { z } from "zod";

export const APP_CONFIG = Symbol("APP_CONFIG");

const schema = z.object({
  TASK_API_DATABASE_URL: z.string().min(1, "ต้องตั้ง TASK_API_DATABASE_URL (ดู .env.example)"),
  PORT: z.coerce.number().int().positive().default(3000),
});

export interface AppConfig {
  databaseUrl: string;
  port: number;
}

/** อ่านและตรวจ env ครั้งเดียวตอนเริ่มระบบ — ขาดค่าที่จำเป็นต้องล้มทันทีพร้อมข้อความที่บอกวิธีแก้ (ไม่ปล่อยให้ไปพังกลางทาง) */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`ตั้งค่า environment ไม่ครบ: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }
  return { databaseUrl: parsed.data.TASK_API_DATABASE_URL, port: parsed.data.PORT };
}
