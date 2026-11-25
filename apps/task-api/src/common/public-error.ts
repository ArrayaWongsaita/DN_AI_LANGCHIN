export interface PublicError {
  status: number;
  message: string;
}

/**
 * แปลง error ภายใน/ของ provider เป็น status + ข้อความไทยที่ปลอดภัยต่อการส่งให้ client
 * ไม่ส่ง err.message, stack, path หรือ key ออกไปเด็ดขาด (รายละเอียดเต็มอยู่ใน log ฝั่งเซิร์ฟเวอร์เท่านั้น)
 */
export function classifyError(err: unknown): PublicError {
  const e = (err ?? {}) as { status?: number; statusCode?: number; name?: string; code?: string; message?: string };
  const status = e.status ?? e.statusCode;
  const msg = e.message ?? "";
  if (status === 408 || status === 504 || e.name === "TimeoutError" || e.code === "ETIMEDOUT" || /timed? ?out|timeout/i.test(msg)) {
    return { status: 504, message: "AI ตอบช้าเกินไป กรุณาลองใหม่อีกครั้ง" };
  }
  if (status === 429) return { status: 503, message: "ผู้ให้บริการ AI ใช้งานหนาแน่นชั่วคราว กรุณาลองใหม่ในอีกสักครู่" };
  if (/tool_use_failed|output_parse_failed|<\|channel\|>/.test(msg)) {
    return { status: 503, message: "AI ตอบกลับในรูปแบบที่ไม่ถูกต้องชั่วคราว กรุณาลองใหม่อีกครั้ง" };
  }
  if (typeof status === "number" && status >= 500) return { status: 503, message: "ผู้ให้บริการ AI ขัดข้องชั่วคราว กรุณาลองใหม่ภายหลัง" };
  return { status: 500, message: "เกิดข้อผิดพลาดภายในระบบ" };
}

/** Replaces the English messages produced by Nest/Express (unknown route, broken JSON, body too large) with Thai ones; anything else is returned unchanged. */
export function localizeMessage(status: number, message: string): string {
  if (/^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /.test(message)) return "ไม่พบเส้นทางที่เรียก";
  if (status === 413 || /entity too large/i.test(message)) return "ข้อมูลที่ส่งมาใหญ่เกินกำหนด";
  if (status === 400 && /JSON|Unexpected token|Expected property name/.test(message)) return "รูปแบบ JSON ที่ส่งมาไม่ถูกต้อง";
  return message;
}
