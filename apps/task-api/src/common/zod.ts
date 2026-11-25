import { BadRequestException } from "@nestjs/common";
import type { z } from "zod";

/** Zod's built-in messages are English ("Invalid input: expected string, received undefined"); schema-authored Thai messages are kept. */
const isDefaultMessage = (m: string) => /^Invalid |^Too (small|big)|^Unrecognized key/.test(m);

/** ตรวจ body ด้วย Zod; ผิด → 400 พร้อมข้อความภาษาไทยจาก schema (ไม่ส่ง stack/รายละเอียดภายใน) */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const r = schema.safeParse(body);
  if (!r.success) {
    const messages = r.error.issues.map((i) => (isDefaultMessage(i.message) ? `ข้อมูล "${i.path.join(".") || "body"}" ไม่ครบหรือรูปแบบไม่ถูกต้อง` : i.message));
    throw new BadRequestException(messages.join("; "));
  }
  return r.data;
}
