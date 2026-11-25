import { z } from "zod";
import type { PublicUser } from "../auth/auth.service.js";

/** ข้อมูลที่ backend สร้างจากผู้ใช้ที่ตรวจตัวตนแล้ว แล้วส่งให้ agent/tool ผ่าน runtime context — model แก้ไม่ได้ */
export const runtimeContextSchema = z.object({
  userId: z.string(),
  role: z.enum(["user", "admin"]),
  locale: z.enum(["th", "en"]),
});
export type RuntimeContext = z.infer<typeof runtimeContextSchema>;

export function buildRuntimeContext(user: Pick<PublicUser, "id" | "role" | "locale">): RuntimeContext {
  return {
    userId: user.id,
    role: user.role === "admin" ? "admin" : "user",
    locale: user.locale === "en" ? "en" : "th",
  };
}
