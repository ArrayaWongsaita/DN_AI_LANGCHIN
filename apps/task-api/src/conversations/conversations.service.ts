import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class ConversationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  create(userId: string, title?: string) {
    return this.prisma.conversation.create({ data: { userId, title: title?.trim() || null } });
  }

  list(userId: string) {
    return this.prisma.conversation.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
  }

  /** ด่านเดียวของการเช็คเจ้าของ: ไม่ใช่ของ user = 404 (ไม่บอกว่ามีอยู่) */
  async getOwned(userId: string, id: string) {
    const c = await this.prisma.conversation.findFirst({ where: { id, userId } }).catch(() => null); // id รูปแบบผิด → ถือว่าไม่พบ
    if (!c) throw new NotFoundException("ไม่พบบทสนทนา");
    return c;
  }

  touch(id: string) {
    return this.prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
  }

  async remove(userId: string, id: string) {
    await this.getOwned(userId, id);
    await this.prisma.conversation.delete({ where: { id } });
  }
}
