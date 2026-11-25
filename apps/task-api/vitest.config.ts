import { defineConfig } from "vitest/config";

// อ่าน .env ของรีโป (ถ้ามี) เพื่อให้ spec ที่ใช้ฐานข้อมูลหา TASK_API_DATABASE_URL เจอ — ไม่ print ค่าใดๆ
try {
  process.loadEnvFile(new URL("../../.env", import.meta.url));
} catch {
  /* ไม่มี .env: spec ที่ต้องใช้ DB จะถูกข้ามพร้อมข้อความ */
}

export default defineConfig({
  test: {
    include: ["test/**/*.spec.ts"],
    testTimeout: 30_000,
    fileParallelism: false, // spec ใช้ฐานข้อมูลร่วมกัน รันทีละไฟล์
    env: { LANGSMITH_TRACING: "false" },
  },
});
