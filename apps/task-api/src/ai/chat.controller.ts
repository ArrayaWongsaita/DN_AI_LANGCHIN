import { BadRequestException, Body, Controller, HttpCode, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { DevUserGuard, type RequestWithUser } from "../common/dev-user.guard.js";
import { AgentService, THREAD_ID_PATTERN } from "./agent.service.js";

const ChatBody = z.object({
  message: z.string().trim().min(1, "ข้อความต้องไม่ว่าง").max(4000, "ข้อความยาวเกิน 4000 ตัวอักษร"),
  threadId: z.string().regex(THREAD_ID_PATTERN, "threadId ใช้ได้เฉพาะ a-z A-Z 0-9 - (ไม่เกิน 64 ตัว)").default("default"),
});

@Controller("chat")
@UseGuards(DevUserGuard)
export class ChatController {
  constructor(@Inject(AgentService) private readonly agent: AgentService) {}

  @Post()
  @HttpCode(200)
  async chat(@Body() body: unknown, @Req() req: RequestWithUser) {
    const parsed = ChatBody.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues.map((i) => i.message).join("; "));
    return this.agent.run({ userId: req.user.id, ...parsed.data });
  }
}
