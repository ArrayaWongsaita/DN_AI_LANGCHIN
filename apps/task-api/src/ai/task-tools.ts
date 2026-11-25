import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TaskPriority, TaskStatus } from "../tasks/task.schemas.js";
import type { RuntimeContext } from "./runtime-context.js";
import type { TasksService } from "../tasks/tasks.service.js";

type Runtime = { context?: Partial<RuntimeContext> } | undefined;

/** userId มาจาก runtime context เท่านั้น — schema ของ tool ไม่มีฟิลด์ userId ต่อให้ model ส่งมาก็ไม่มีผล */
export function userIdOf(runtime: unknown): string {
  const id = (runtime as Runtime)?.context?.userId;
  if (!id) throw new Error("ไม่พบ userId ใน runtime context");
  return id;
}

const show = (t: { id: string; title: string; status: string; priority: string; dueDate: Date | null }) => ({
  id: t.id,
  title: t.title,
  status: t.status,
  priority: t.priority,
  dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null,
});

/** tool ของ agent = adapter บางๆ เหนือ TasksService (กฎธุรกิจ + การเช็คเจ้าของอยู่ที่ service ไม่ใช่ที่นี่) */
export function createTaskTools(tasks: TasksService) {
  const getTasks = tool(
    async ({ status }, runtime) => JSON.stringify((await tasks.list(userIdOf(runtime), { status })).map(show)),
    {
      name: "getTasks",
      description: "ดูรายการงานของผู้ใช้ปัจจุบัน (กรองตามสถานะได้)",
      schema: z.object({ status: TaskStatus.optional().describe("Pending | InProgress | Completed") }),
    },
  );

  const createTask = tool(
    async (input, runtime) => JSON.stringify(show(await tasks.create(userIdOf(runtime), input))),
    {
      name: "createTask",
      description: "สร้างงานใหม่ให้ผู้ใช้ปัจจุบัน",
      schema: z.object({
        title: z.string().describe("ชื่องาน"),
        description: z.string().optional(),
        priority: TaskPriority.optional(),
        dueDate: z.string().optional().describe("วันครบกำหนด รูปแบบ ISO เช่น 2026-12-01"),
      }),
    },
  );

  const updateTask = tool(
    async ({ id, ...patch }, runtime) => JSON.stringify(show(await tasks.update(userIdOf(runtime), id, patch))),
    {
      name: "updateTask",
      description: "แก้ไขงาน (ชื่อ รายละเอียด ความสำคัญ สถานะ วันครบกำหนด)",
      schema: z.object({
        id: z.string().describe("id ของงาน"),
        title: z.string().optional(),
        description: z.string().optional(),
        priority: TaskPriority.optional(),
        status: TaskStatus.optional(),
        dueDate: z.string().optional(),
      }),
    },
  );

  const completeTask = tool(
    async ({ id }, runtime) => JSON.stringify(show(await tasks.complete(userIdOf(runtime), id))),
    { name: "completeTask", description: "ทำเครื่องหมายว่างานเสร็จแล้ว", schema: z.object({ id: z.string() }) },
  );

  const deleteTask = tool(
    async ({ id }, runtime) => {
      await tasks.remove(userIdOf(runtime), id);
      return JSON.stringify({ deleted: id });
    },
    { name: "deleteTask", description: "ลบงาน (ต้องได้รับอนุมัติจากผู้ใช้ก่อนเสมอ)", schema: z.object({ id: z.string() }) },
  );

  return [getTasks, createTask, updateTask, completeTask, deleteTask];
}
