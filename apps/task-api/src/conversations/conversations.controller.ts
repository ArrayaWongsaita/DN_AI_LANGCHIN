import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AgentService } from "../ai/agent.service.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { PublicUser } from "../auth/auth.service.js";
import { JwtGuard } from "../auth/jwt.guard.js";
import { parseBody } from "../common/zod.js";
import { ConversationsService } from "./conversations.service.js";

const CreateBody = z.object({ title: z.string().trim().max(200).optional() });

@Controller("conversations")
@UseGuards(JwtGuard)
export class ConversationsController {
  constructor(
    @Inject(ConversationsService) private readonly conversations: ConversationsService,
    @Inject(AgentService) private readonly agent: AgentService,
  ) {}

  @Post()
  create(@CurrentUser() user: PublicUser, @Body() body: unknown) {
    return this.conversations.create(user.id, parseBody(CreateBody, body ?? {}).title);
  }

  @Get()
  list(@CurrentUser() user: PublicUser) {
    return this.conversations.list(user.id);
  }

  @Get(":id")
  get(@CurrentUser() user: PublicUser, @Param("id") id: string) {
    return this.conversations.getOwned(user.id, id);
  }

  /** ข้อความอ่านจาก checkpointer (แหล่งความจริงของประวัติ) หลังตรวจเจ้าของแล้วเท่านั้น */
  @Get(":id/messages")
  async messages(@CurrentUser() user: PublicUser, @Param("id") id: string) {
    await this.conversations.getOwned(user.id, id);
    return this.agent.messages(user.id, id);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: PublicUser, @Param("id") id: string) {
    await this.conversations.remove(user.id, id);
    await this.agent.deleteThread(user.id, id);
  }
}
