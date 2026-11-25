/** ตัวช่วยสำหรับ LangSmith (ใช้ใน Part 18+) — tracing ปิดเป็นค่าเริ่มต้น เพราะ free plan มี quota จำกัด */

export const DEFAULT_LANGSMITH_PROJECT = "langchain-course";

/** ต้องมี LANGSMITH_API_KEY — ถ้ามีจะเปิด tracing ให้ (ไม่พิมพ์ค่า key ออกมาเด็ดขาด) */
export function requireLangSmith(): { project: string } {
  const key = process.env.LANGSMITH_API_KEY;
  if (!key || key.trim() === "") {
    throw new Error(
      "ไม่พบ LANGSMITH_API_KEY — สมัครฟรีที่ smith.langchain.com แล้วใส่ใน .env (ดู .env.example)",
    );
  }
  process.env.LANGSMITH_TRACING = "true";
  process.env.LANGSMITH_PROJECT ||= DEFAULT_LANGSMITH_PROJECT;
  return { project: process.env.LANGSMITH_PROJECT };
}

export function isTracingEnabled(): boolean {
  return process.env.LANGSMITH_TRACING === "true";
}

let warned = false;

/**
 * รันงานที่อาจส่ง trace — ถ้า error มาจาก LangSmith (quota เต็ม/403/429/network) ให้เตือนครั้งเดียวแล้วข้าม
 * error อื่นๆ ถูกโยนต่อตามปกติ เพราะ tracing ต้องไม่ทำให้ agent พัง
 */
export async function withTracingGuard<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/langsmith|api\.smith/i.test(message)) {
      if (!warned) {
        warned = true;
        console.warn("⚠️  ส่ง trace ไป LangSmith ไม่สำเร็จ (อาจเต็ม quota ของ free plan) — ข้ามและทำงานต่อ");
      }
      return undefined;
    }
    throw error;
  }
}
