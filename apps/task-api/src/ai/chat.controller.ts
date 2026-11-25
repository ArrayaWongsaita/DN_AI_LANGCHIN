import { Body, Controller, HttpCode, Inject, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { PublicUser } from "../auth/auth.service.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtGuard } from "../auth/jwt.guard.js";
import { parseBody } from "../common/zod.js";
import { AgentService, THREAD_ID_PATTERN } from "./agent.service.js";
import { buildRuntimeContext } from "./runtime-context.js";

const ChatBody = z.object({
  message: z.string().trim().min(1, "ข้อความต้องไม่ว่าง").max(4000, "ข้อความยาวเกิน 4000 ตัวอักษร"),
  threadId: z.string().regex(THREAD_ID_PATTERN, "threadId ใช้ได้เฉพาะ a-z A-Z 0-9 - (ไม่เกิน 64 ตัว)").default("default"),
});

/** `POST /chat` แบบง่าย (ไม่ผูกกับตาราง conversation) — บทสนทนาจริงใช้ `/conversations/:id/chat` */
@Controller("chat")
@UseGuards(JwtGuard)
export class ChatController {
  constructor(@Inject(AgentService) private readonly agent: AgentService) {}

  @Post()
  @HttpCode(200)
  async chat(@Body() body: unknown, @CurrentUser() user: PublicUser) {
    const { message, threadId } = parseBody(ChatBody, body);
    return this.agent.run({ ctx: buildRuntimeContext(user), conversationId: threadId, message });
  }
}
