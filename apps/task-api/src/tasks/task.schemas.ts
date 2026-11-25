import { z } from "zod";

export const TaskStatus = z.enum(["Pending", "InProgress", "Completed"]);
export const TaskPriority = z.enum(["Low", "Medium", "High"]);

const title = z.string().trim().min(1, "ชื่องานต้องไม่ว่าง").max(200, "ชื่องานยาวเกิน 200 ตัวอักษร");
const dueDate = z.coerce.date({ error: "วันที่ไม่ถูกต้อง (ใช้รูปแบบ ISO เช่น 2026-12-01)" });

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
