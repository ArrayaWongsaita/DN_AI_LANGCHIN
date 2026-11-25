import { defineConfig } from "prisma/config";

// Prisma 7: ที่อยู่ฐานข้อมูลอยู่ที่นี่ (ไม่อยู่ใน schema.prisma) — รัน CLI ด้วย --env-file=../../.env
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.TASK_API_DATABASE_URL ?? "" },
});
