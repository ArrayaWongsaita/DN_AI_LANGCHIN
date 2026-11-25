import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type { Prisma } from "../generated/prisma/client.js";

/**
 * Repository = ชั้นเดียวที่รู้จัก Prisma — ทุก query ต้องมี userId เป็นเงื่อนไขเสมอ (row-level isolation)
 * Service ข้างบนจึงไม่มีทางลืมกรองเจ้าของ
 */
@Injectable()
export class TasksRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  create(userId: string, data: Omit<Prisma.TaskUncheckedCreateInput, "userId">) {
    return this.prisma.task.create({ data: { ...data, userId } });
  }

  list(userId: string, where: Prisma.TaskWhereInput = {}) {
    return this.prisma.task.findMany({ where: { ...where, userId }, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] });
  }

  findOwned(userId: string, id: string) {
    // id รูปแบบผิด (ไม่ใช่ uuid) ถือว่าไม่พบ ไม่ใช่ error ของฐานข้อมูล
    return this.prisma.task.findFirst({ where: { id, userId } }).catch(() => null);
  }

  /** update/delete แบบมีเจ้าของใน where — คืน null ถ้าไม่ใช่ของ user (ไม่ throw P2025) */
  async updateOwned(userId: string, id: string, data: Prisma.TaskUpdateInput) {
    const { count } = await this.prisma.task.updateMany({ where: { id, userId }, data }).catch(() => ({ count: 0 }));
    return count === 0 ? null : this.findOwned(userId, id);
  }

  async deleteOwned(userId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.task.deleteMany({ where: { id, userId } }).catch(() => ({ count: 0 }));
    return count > 0;
  }
}
