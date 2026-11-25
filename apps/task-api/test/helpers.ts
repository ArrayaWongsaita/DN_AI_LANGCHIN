import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

/** spec ที่ใช้ฐานข้อมูลจริง: ถ้าไม่มี/ต่อไม่ได้ จะถูกข้ามพร้อมข้อความที่บอกวิธีแก้ (ไม่ crash) */
export async function dbAvailable(): Promise<boolean> {
  const url = process.env.TASK_API_DATABASE_URL;
  if (!url) return false;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, connectionTimeoutMillis: 2000 }) });
  try {
    await prisma.$queryRaw`select 1`;
    await prisma.user.count(); // ตารางต้องมีแล้ว (รัน migrate)
    return true;
  } catch {
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

export const hasDb = await dbAvailable();
if (!hasDb) console.warn("⚠️  ข้าม spec ที่ใช้ฐานข้อมูล: รัน `pnpm db:up` (root) → `pnpm --filter task-api db:create && pnpm --filter task-api migrate` และตั้ง TASK_API_DATABASE_URL");

export const uniqueEmail = (label = "u") => `${label}-${randomUUID().slice(0, 8)}@test.local`;
