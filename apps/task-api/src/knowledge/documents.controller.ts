import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, UseGuards } from "@nestjs/common";
import type { PublicUser } from "../auth/auth.service.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtGuard } from "../auth/jwt.guard.js";
import { RateLimitGuard } from "../common/rate-limit.guard.js";
import { KnowledgeService } from "./knowledge.service.js";

/** อัปโหลดเป็น JSON `{ title, filename, content }` (ไฟล์ .txt/.md อ่านเป็นข้อความที่ฝั่ง client) */
@Controller("documents")
@UseGuards(JwtGuard, RateLimitGuard)
export class DocumentsController {
  constructor(@Inject(KnowledgeService) private readonly knowledge: KnowledgeService) {}

  @Get()
  async list(@CurrentUser() user: PublicUser) {
    return (await this.knowledge.list(user.id)).map((d) => ({ id: d.id, title: d.title, source: d.source, createdAt: d.createdAt, chunks: d._count.chunks }));
  }

  @Post()
  upload(@CurrentUser() user: PublicUser, @Body() body: unknown) {
    return this.knowledge.addDocument(user.id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: PublicUser, @Param("id") id: string) {
    return this.knowledge.remove(user.id, id);
  }
}
