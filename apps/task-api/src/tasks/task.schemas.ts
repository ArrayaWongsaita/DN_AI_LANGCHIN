import { z } from "zod";
import { parseDueDate } from "./dates.js";

export const TaskStatus = z.enum(["Pending", "InProgress", "Completed"]);
export const TaskPriority = z.enum(["Low", "Medium", "High"]);

const title = z.string().trim().min(1, "ชื่องานต้องไม่ว่าง").max(200, "ชื่องานยาวเกิน 200 ตัวอักษร");
const dueDate = z.union([z.string(), z.date()]).transform((v, ctx) => {
  try {
    return parseDueDate(v);
  } catch {
    ctx.addIssue({ code: "custom", message: "วันที่ไม่ถูกต้อง (ใช้รูปแบบ YYYY-MM-DD เช่น 2026-12-01)" });
    return z.NEVER;
  }
});

export const CreateTaskInput = z.object({
  title,
  description: z.string().trim().max(2000).optional(),
  priority: TaskPriority.optional(),
  dueDate: dueDate.optional(),
});

export const UpdateTaskInput = z
  .object({
    title: title.optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    priority: TaskPriority.optional(),
    status: TaskStatus.optional(),
    dueDate: dueDate.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้");

export type CreateTaskInput = z.infer<typeof CreateTaskInput>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;
export type TaskStatusValue = z.infer<typeof TaskStatus>;

export const TaskQuery = z.object({
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  q: z.string().trim().min(1).max(200).optional(),
  overdue: z.enum(["true", "false"]).optional(),
  today: z.enum(["true", "false"]).optional(),
});
export type TaskQuery = z.infer<typeof TaskQuery>;
export type TaskPriorityValue = z.infer<typeof TaskPriority>;
