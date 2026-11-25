// สร้างผู้ใช้ทดสอบ (ไว้ลอง POST /chat ด้วย header x-dev-user-id ก่อนมีระบบ login) — พิมพ์ id ออกมา
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TASK_API_DATABASE_URL }) });
const email = "dev@example.local";
const user = await prisma.user.upsert({ where: { email }, update: {}, create: { name: "Dev", email, passwordHash: "not-a-real-hash" } });
console.log(user.id);
await prisma.$disconnect();
