import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";
import { withDb } from "../utils/db.js";
import { requireEnv } from "../utils/env.js";

/**
 * เปิด PostgresSaver (checkpointer ของบทสนทนา) + PostgresStore (long-term memory) แล้วปิดให้เสมอ
 * ถ้า Postgres ไม่ได้รัน จะแจ้งวิธีแก้ (docker compose up -d) แทน ECONNREFUSED ดิบๆ
 */
export async function withPostgresMemory<T>(
  fn: (memory: { checkpointer: PostgresSaver; store: PostgresStore }) => Promise<T>,
): Promise<T> {
  await withDb(async () => {}); // ตรวจการเชื่อมต่อ + ข้อความ error ที่เป็นมิตร
  const url = requireEnv("DATABASE_URL");
  const checkpointer = PostgresSaver.fromConnString(url);
  const store = PostgresStore.fromConnString(url);
  try {
    await checkpointer.setup(); // สร้างตารางครั้งแรก (ปลอดภัยถ้าเรียกซ้ำ)
    await store.setup();
    return await fn({ checkpointer, store });
  } finally {
    await checkpointer.end();
    await store.stop();
  }
}
