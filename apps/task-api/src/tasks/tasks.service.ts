import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CreateTaskInput, UpdateTaskInput, type TaskStatusValue } from "./task.schemas.js";
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

  async list(userId: string, filter: { status?: TaskStatusValue } = {}) {
    return this.repo.list(userId, filter.status ? { status: filter.status } : {});
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
