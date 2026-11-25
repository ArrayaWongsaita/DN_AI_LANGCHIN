// ตัวช่วยของตัวอย่าง Part 17 (ขึ้นต้นด้วย _ จึงไม่อยู่ใน `pnpm play`)
import { z } from "zod";
import { TaskStore, type TaskContext } from "../../src/data/tasks.js";
import { messageText } from "../../src/utils/text.js";
import { retryAsync } from "../../src/utils/retry.js";

/** context schema ที่ agent รับตอน invoke — userId/role มาจากระบบ login (ที่นี่จำลองเอา) */
export const contextSchema = z.object({
  userId: z.string(),
  role: z.enum(["viewer", "editor", "admin"]),
  name: z.string(),
  language: z.enum(["th", "en"]).optional(),
});

export const somchai = (role: TaskContext["role"] = "editor"): TaskContext => ({ userId: "u1", role, name: "สมชาย" });

export const newStore = () => new TaskStore();

/** เรียก agent พร้อม retry เฉพาะ error ชั่วคราว (Groq gpt-oss บางครั้ง 400 tool_use_failed / 429) แล้วคืนข้อความตอบสุดท้าย */
export async function ask(
  agent: { invoke: (input: { messages: { role: "user"; content: string }[] }, config: { context: TaskContext; recursionLimit?: number }) => Promise<{ messages: unknown[] }> },
  text: string,
  context: TaskContext,
  recursionLimit = 10, // middleware แต่ละตัวที่มี hook นับเป็น 1 step ด้วย — stack หนาๆ ต้องเพิ่ม (ดู 17-10)
): Promise<string> {
  const r = await retryAsync(() => agent.invoke({ messages: [{ role: "user", content: text }] }, { context, recursionLimit }));
  return messageText(r.messages.at(-1) as { content: never }).trim();
}
