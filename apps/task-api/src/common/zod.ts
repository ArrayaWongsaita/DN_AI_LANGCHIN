import { BadRequestException } from "@nestjs/common";
import type { z } from "zod";

/** ตรวจ body ด้วย Zod; ผิด → 400 พร้อมข้อความภาษาไทยจาก schema (ไม่ส่ง stack/รายละเอียดภายใน) */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const r = schema.safeParse(body);
  if (!r.success) throw new BadRequestException(r.error.issues.map((i) => i.message).join("; "));
  return r.data;
}
