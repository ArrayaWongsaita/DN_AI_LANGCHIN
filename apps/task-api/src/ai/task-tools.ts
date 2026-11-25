import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { formatDueDate } from "../tasks/dates.js";
import { TaskPriority, TaskStatus } from "../tasks/task.schemas.js";
import type { TasksService } from "../tasks/tasks.service.js";
import type { RuntimeContext } from "./runtime-context.js";

type Runtime = { context?: Partial<RuntimeContext> } | undefined;

/** userId มาจาก runtime context เท่านั้น — schema ของ tool ไม่มีฟิลด์ userId ต่อให้ model ส่งมาก็ไม่มีผล */
export function userIdOf(runtime: unknown): string {
  const id = (runtime as Runtime)?.context?.userId;
  if (!id) throw new Error("ไม่พบ userId ใน runtime context");
  return id;
}

const show = (t: { id: string; title: string; description?: string | null; status: string; priority: string; dueDate: Date | null }) => ({
  id: t.id,
  title: t.title,
  ...(t.description ? { description: t.description } : {}),
  status: t.status,
  priority: t.priority,
  dueDate: formatDueDate(t.dueDate),
});
const list = (rows: Parameters<typeof show>[0][]) => JSON.stringify(rows.map(show));
const dueDateField = z.string().describe("วันครบกำหนด รูปแบบ YYYY-MM-DD (ปฏิทิน Asia/Bangkok) เช่น 2026-12-01");

/**
 * Task tools ทั้ง 12 ตัว (adapter บางๆ เหนือ TasksService — กฎธุรกิจ/การเช็คเจ้าของอยู่ที่ service)
 * read-only: getTasks getTaskById searchTasks getTodayTasks getOverdueTasks getTaskSummary
 * write: createTask updateTask completeTask changeTaskPriority changeTaskDueDate · destructive: deleteTask (ต้องอนุมัติ)
 */
export function createTaskTools(tasks: TasksService) {
  const getTasks = tool(async ({ status, priority }, rt) => list(await tasks.list(userIdOf(rt), { status, priority })), {
    name: "getTasks",
    description: "ดูรายการงานของผู้ใช้ปัจจุบัน (กรองตามสถานะ/ความสำคัญได้)",
    schema: z.object({ status: TaskStatus.optional().describe("Pending | InProgress | Completed"), priority: TaskPriority.optional() }),
  });
  const getTaskById = tool(async ({ id }, rt) => JSON.stringify(show(await tasks.get(userIdOf(rt), id))), {
    name: "getTaskById",
    description: "ดูงานเดียวตาม id",
    schema: z.object({ id: z.string() }),
  });
  const searchTasks = tool(async ({ query }, rt) => list(await tasks.search(userIdOf(rt), query)), {
    name: "searchTasks",
    description: "ค้นหางานจากคำในชื่อหรือรายละเอียด (เช่น 'backend', 'ประชุม')",
    schema: z.object({ query: z.string().min(1) }),
  });
  const getTodayTasks = tool(async (_i, rt) => list(await tasks.listToday(userIdOf(rt))), {
    name: "getTodayTasks",
    description: "งานที่ครบกำหนดวันนี้ (ปฏิทิน Asia/Bangkok) และยังไม่เสร็จ",
    schema: z.object({}),
  });
  const getOverdueTasks = tool(async (_i, rt) => list(await tasks.listOverdue(userIdOf(rt))), {
    name: "getOverdueTasks",
    description: "งานที่เลยกำหนดแล้วและยังไม่เสร็จ",
    schema: z.object({}),
  });
  const getTaskSummary = tool(async (_i, rt) => JSON.stringify(await tasks.summary(userIdOf(rt))), {
    name: "getTaskSummary",
    description: "ตัวเลขสรุปงาน: ทั้งหมด ตามสถานะ/ความสำคัญ เลยกำหนด วันนี้ สัปดาห์นี้ เสร็จใน 7 วันที่ผ่านมา",
    schema: z.object({}),
  });

  const createTask = tool(async (input, rt) => JSON.stringify(show(await tasks.create(userIdOf(rt), input))), {
    name: "createTask",
    description: "สร้างงานใหม่ให้ผู้ใช้ปัจจุบัน",
    schema: z.object({ title: z.string().describe("ชื่องาน"), description: z.string().optional(), priority: TaskPriority.optional(), dueDate: dueDateField.optional() }),
  });
  const updateTask = tool(async ({ id, ...patch }, rt) => JSON.stringify(show(await tasks.update(userIdOf(rt), id, patch))), {
    name: "updateTask",
    description: "แก้ไขงาน (ชื่อ รายละเอียด ความสำคัญ สถานะ วันครบกำหนด)",
    schema: z.object({ id: z.string(), title: z.string().optional(), description: z.string().optional(), priority: TaskPriority.optional(), status: TaskStatus.optional(), dueDate: dueDateField.optional() }),
  });
  const completeTask = tool(async ({ id }, rt) => JSON.stringify(show(await tasks.complete(userIdOf(rt), id))), {
    name: "completeTask",
    description: "ทำเครื่องหมายว่างานเสร็จแล้ว",
    schema: z.object({ id: z.string() }),
  });
  const changeTaskPriority = tool(async ({ id, priority }, rt) => JSON.stringify(show(await tasks.update(userIdOf(rt), id, { priority }))), {
    name: "changeTaskPriority",
    description: "เปลี่ยนความสำคัญของงาน (Low | Medium | High)",
    schema: z.object({ id: z.string(), priority: TaskPriority }),
  });
  const changeTaskDueDate = tool(async ({ id, dueDate }, rt) => JSON.stringify(show(await tasks.update(userIdOf(rt), id, { dueDate }))), {
    name: "changeTaskDueDate",
    description: "เปลี่ยนวันครบกำหนดของงาน (ส่ง null เพื่อล้างวัน)",
    schema: z.object({ id: z.string(), dueDate: dueDateField.nullable() }),
  });
  const deleteTask = tool(
    async ({ id }, rt) => {
      await tasks.remove(userIdOf(rt), id);
      return JSON.stringify({ deleted: id });
    },
    { name: "deleteTask", description: "ลบงาน (ต้องได้รับอนุมัติจากผู้ใช้ก่อนเสมอ)", schema: z.object({ id: z.string() }) },
  );

  return [getTasks, getTaskById, searchTasks, getTodayTasks, getOverdueTasks, getTaskSummary, createTask, updateTask, completeTask, changeTaskPriority, changeTaskDueDate, deleteTask];
}
