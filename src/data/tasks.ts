import { tool } from "@langchain/core/tools";
import { z } from "zod";

/** ข้อมูล task จำลอง (in-memory) สำหรับ Part 17–18 — ไม่มี side effect จริง */
export type Role = "viewer" | "editor" | "admin";
export type ToolKind = "read" | "write" | "destructive";

export interface Task {
  id: string;
  title: string;
  status: "pending" | "done";
  ownerId: string;
}

/** context ที่ฝั่ง backend สร้างจากการ login จริง — ห้ามรับมาจาก model/ผู้ใช้พิมพ์เอง */
export interface TaskContext {
  userId: string;
  role: Role;
  name: string;
  language?: "th" | "en";
}

export class TaskStore {
  private tasks: Task[];
  private seq: number;

  constructor(seed: Task[] = defaultTasks()) {
    this.tasks = seed.map((t) => ({ ...t }));
    this.seq = seed.length;
  }

  list(userId: string): Task[] {
    return this.tasks.filter((t) => t.ownerId === userId).map((t) => ({ ...t }));
  }

  /** คืน task เฉพาะที่เป็นของ userId — task ของคนอื่นถือว่า "ไม่พบ" (ไม่บอกว่ามีอยู่) */
  get(userId: string, id: string): Task | undefined {
    const t = this.tasks.find((x) => x.id === id && x.ownerId === userId);
    return t ? { ...t } : undefined;
  }

  create(userId: string, title: string): Task {
    const task: Task = { id: `t${++this.seq}`, title, status: "pending", ownerId: userId };
    this.tasks.push(task);
    return { ...task };
  }

  update(userId: string, id: string, patch: Partial<Pick<Task, "title" | "status">>): Task | undefined {
    const t = this.tasks.find((x) => x.id === id && x.ownerId === userId);
    if (!t) return undefined;
    Object.assign(t, patch);
    return { ...t };
  }

  remove(userId: string, id: string): boolean {
    const i = this.tasks.findIndex((x) => x.id === id && x.ownerId === userId);
    if (i < 0) return false;
    this.tasks.splice(i, 1);
    return true;
  }
}

export function defaultTasks(): Task[] {
  return [
    { id: "t1", title: "อ่านหนังสือ TypeScript", status: "pending", ownerId: "u1" },
    { id: "t2", title: "ประชุมทีม backend", status: "pending", ownerId: "u1" },
    { id: "t3", title: "ส่งรายงานประจำสัปดาห์", status: "done", ownerId: "u1" },
    { id: "t4", title: "งานลับของ user สอง", status: "pending", ownerId: "u2" },
  ];
}

/** ประเภทของแต่ละ tool — ใช้ตัดสินใจเรื่องสิทธิ์ (role) และการขออนุมัติ */
export const TOOL_KINDS: Record<string, ToolKind> = {
  getTasks: "read",
  createTask: "write",
  updateTask: "write",
  deleteTask: "destructive",
};

type RuntimeLike = { context?: Partial<TaskContext> } | undefined;

/** userId มาจาก runtime context เท่านั้น (ไม่มีใน schema ของ tool → model เสนอค่ามาก็ไม่มีผล) */
function userIdOf(runtime: RuntimeLike): string {
  const id = runtime?.context?.userId;
  if (!id) throw new Error("ไม่พบ userId ใน runtime context");
  return id;
}

/** tool ทั้งสี่ตัวแบบมีชื่อ (สะดวกเวลาทดสอบทีละตัว) — `all` ใช้ส่งให้ agent */
export function createTaskToolset(store: TaskStore) {
  const getTasks = tool(
    async (_input, runtime) => JSON.stringify(store.list(userIdOf(runtime as RuntimeLike))),
    { name: "getTasks", description: "ดูรายการ task ทั้งหมดของผู้ใช้ปัจจุบัน", schema: z.object({}) },
  );

  const createTask = tool(
    async ({ title }, runtime) => JSON.stringify(store.create(userIdOf(runtime as RuntimeLike), title)),
    {
      name: "createTask",
      description: "สร้าง task ใหม่ให้ผู้ใช้ปัจจุบัน",
      schema: z.object({ title: z.string().min(1).max(200).describe("ชื่องาน") }),
    },
  );

  const updateTask = tool(
    async ({ id, title, status }, runtime) => {
      const updated = store.update(userIdOf(runtime as RuntimeLike), id, { ...(title && { title }), ...(status && { status }) });
      if (!updated) throw new Error(`ไม่พบ task ${id}`); // throw เพื่อให้ middleware (audit/error) เห็นว่าล้มเหลวจริง
      return JSON.stringify(updated);
    },
    {
      name: "updateTask",
      description: "แก้ไขชื่อหรือสถานะของ task",
      schema: z.object({
        id: z.string().describe("id ของ task"),
        title: z.string().min(1).max(200).optional(),
        status: z.enum(["pending", "done"]).optional(),
      }),
    },
  );

  const deleteTask = tool(
    async ({ id }, runtime) => {
      if (!store.remove(userIdOf(runtime as RuntimeLike), id)) throw new Error(`ไม่พบ task ${id}`);
      return `ลบ task ${id} แล้ว`;
    },
    {
      name: "deleteTask",
      description: "ลบ task ถาวร (ต้องได้รับการอนุมัติก่อน)",
      schema: z.object({ id: z.string().describe("id ของ task ที่จะลบ") }),
    },
  );

  return { getTasks, createTask, updateTask, deleteTask, all: [getTasks, createTask, updateTask, deleteTask] };
}

export function createTaskTools(store: TaskStore) {
  return createTaskToolset(store).all;
}
