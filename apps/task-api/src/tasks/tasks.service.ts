import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { addDays, bangkokToday } from "./dates.js";
import { CreateTaskInput, UpdateTaskInput, type TaskPriorityValue, type TaskStatusValue } from "./task.schemas.js";
import { TasksRepository } from "./tasks.repository.js";

/** กฎธุรกิจของงาน — ทั้ง REST controller และ AI tool เรียกผ่านที่นี่ที่เดียว (agent จึงไม่มีสิทธิ์มากกว่าผู้ใช้) */
@Injectable()
export class TasksService {
  constructor(@Inject(TasksRepository) private readonly repo: TasksRepository) {}

  private parse<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } }, input: unknown): T {
    const r = schema.safeParse(input);
    if (!r.success) throw new BadRequestException(r.error.issues.map((i) => i.message).join("; "));
    return r.data;
  }

  async create(userId: string, input: unknown) {
    return this.repo.create(userId, this.parse(CreateTaskInput, input));
  }

  async list(userId: string, filter: { status?: TaskStatusValue; priority?: TaskPriorityValue; q?: string; overdue?: boolean; today?: boolean } = {}, now: Date = new Date()) {
    const where: Prisma.TaskWhereInput = {};
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.q) where.OR = [{ title: { contains: filter.q, mode: "insensitive" } }, { description: { contains: filter.q, mode: "insensitive" } }];
    const today = bangkokToday(now);
    if (filter.overdue) Object.assign(where, { dueDate: { lt: today }, status: { not: "Completed" } });
    if (filter.today) Object.assign(where, { dueDate: today });
    return this.repo.list(userId, where);
  }

  /** งานที่ครบกำหนด "วันนี้" ตามปฏิทิน Asia/Bangkok (ไม่รวมที่เสร็จแล้ว) */
  listToday(userId: string, now: Date = new Date()) {
    return this.repo.list(userId, { dueDate: bangkokToday(now), status: { not: "Completed" } });
  }

  /** งานที่เลยกำหนดก่อนวันนี้ (Bangkok) และยังไม่เสร็จ */
  listOverdue(userId: string, now: Date = new Date()) {
    return this.repo.list(userId, { dueDate: { lt: bangkokToday(now) }, status: { not: "Completed" } });
  }

  search(userId: string, query: string) {
    return this.list(userId, { q: query });
  }

  /** สรุปตัวเลขแบบกำหนดแน่นอน (ไม่ใช้ AI): จำนวนตามสถานะ/ความสำคัญ เลยกำหนด วันนี้ 7 วันข้างหน้า และเสร็จใน 7 วันที่ผ่านมา */
  async summary(userId: string, now: Date = new Date()) {
    const all = await this.repo.list(userId);
    const today = bangkokToday(now);
    const weekEnd = addDays(today, 6);
    const open = all.filter((t) => t.status !== "Completed");
    const count = <K extends string>(keys: readonly K[], pick: (t: (typeof all)[number]) => string) =>
      Object.fromEntries(keys.map((k) => [k, all.filter((t) => pick(t) === k).length])) as Record<K, number>;
    return {
      total: all.length,
      byStatus: count(["Pending", "InProgress", "Completed"] as const, (t) => t.status),
      byPriority: count(["Low", "Medium", "High"] as const, (t) => t.priority),
      overdue: open.filter((t) => t.dueDate && t.dueDate < today).length,
      dueToday: open.filter((t) => t.dueDate?.getTime() === today.getTime()).length,
      dueThisWeek: open.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= weekEnd).length,
      completedLast7Days: all.filter((t) => t.status === "Completed" && t.updatedAt >= addDays(now, -7)).length,
    };
  }

  async get(userId: string, id: string) {
    const task = await this.repo.findOwned(userId, id);
    if (!task) throw new NotFoundException(`ไม่พบงาน ${id}`); // งานของคนอื่นตอบเหมือน "ไม่มี" — ไม่เปิดเผยว่ามีอยู่
    return task;
  }

  async update(userId: string, id: string, input: unknown) {
    const data = this.parse(UpdateTaskInput, input);
    const task = await this.repo.updateOwned(userId, id, data);
    if (!task) throw new NotFoundException(`ไม่พบงาน ${id}`);
    return task;
  }

  /** ทำเครื่องหมายเสร็จ — เรียกซ้ำได้ผลเหมือนเดิม (idempotent) */
  async complete(userId: string, id: string) {
    return this.update(userId, id, { status: "Completed" });
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!(await this.repo.deleteOwned(userId, id))) throw new NotFoundException(`ไม่พบงาน ${id}`);
  }
}
