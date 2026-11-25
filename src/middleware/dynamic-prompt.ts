import { createMiddleware } from "langchain";
import type { TaskContext } from "../data/tasks.js";

/** ต่อ system prompt จาก runtime context (ชื่อ, role, ภาษา) ทุกครั้งที่เรียก model — prompt เปลี่ยนตามผู้ใช้โดยไม่ต้องสร้าง agent ใหม่ */
export function createDynamicPromptMiddleware(basePrompt: string) {
  return createMiddleware({
    name: "DynamicPromptMiddleware",
    wrapModelCall: (request, handler) => {
      const c = (request.runtime.context ?? {}) as Partial<TaskContext>;
      const lines = [basePrompt, `ผู้ใช้ชื่อ ${c.name ?? "ไม่ทราบ"} (role: ${c.role ?? "viewer"})`];
      if (c.role === "viewer") lines.push("ผู้ใช้นี้ดูข้อมูลได้อย่างเดียว ถ้าขอแก้ไข ให้แจ้งว่าไม่มีสิทธิ์");
      lines.push(`ตอบเป็นภาษา${c.language === "en" ? "อังกฤษ" : "ไทย"}`);
      return handler({ ...request, systemPrompt: lines.join("\n") });
    },
  });
}
