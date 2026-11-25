import { Body, Controller, Get, HttpCode, Inject, Param, Post, Res, UseGuards, UseInterceptors } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { AgentService, type AgentRunResult } from "../ai/agent.service.js";
import { buildRuntimeContext } from "../ai/runtime-context.js";
import type { PublicUser } from "../auth/auth.service.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtGuard } from "../auth/jwt.guard.js";
import { classifyError } from "../common/public-error.js";
import { RateLimitGuard } from "../common/rate-limit.guard.js";
import { UsageInterceptor } from "../usage/usage.interceptor.js";
import { UsageService } from "../usage/usage.service.js";
import { parseBody } from "../common/zod.js";
import { ApprovalsService, DecisionBody } from "./approvals.service.js";
import { ConversationsService } from "./conversations.service.js";

const ChatBody = z.object({ message: z.string().trim().min(1, "ข้อความต้องไม่ว่าง").max(4000, "ข้อความยาวเกิน 4000 ตัวอักษร") });

const sse = (res: Response, event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

@Controller("conversations/:id")
@UseGuards(JwtGuard, RateLimitGuard)
@UseInterceptors(UsageInterceptor)
export class ConversationChatController {
  constructor(
    @Inject(ConversationsService) private readonly conversations: ConversationsService,
    @Inject(AgentService) private readonly agent: AgentService,
    @Inject(ApprovalsService) private readonly approvals: ApprovalsService,
    @Inject(UsageService) private readonly usage: UsageService,
  ) {}

  /** ตอบแบบรอจบ: ถ้า agent หยุดรออนุมัติ จะได้ `approval: { id, actions }` (ยังไม่มีอะไรถูกลบ) */
  @Post("chat")
  @HttpCode(200)
  async chat(@CurrentUser() user: PublicUser, @Param("id") id: string, @Body() body: unknown) {
    const { message } = parseBody(ChatBody, body);
    await this.conversations.getOwned(user.id, id);
    await this.approvals.ensureChatable(user, id);
    const result = await this.agent.run({ ctx: buildRuntimeContext(user), conversationId: id, message });
    await this.conversations.touch(id);
    return this.withApproval(user.id, id, result);
  }

  private async withApproval(userId: string, conversationId: string, r: AgentRunResult) {
    if (!r.interrupt) return { reply: r.reply, toolCalls: r.toolCalls, usage: r.usage };
    const approval = await this.approvals.create(userId, conversationId, r.interrupt.actions);
    return { reply: r.reply, toolCalls: r.toolCalls, usage: r.usage, approval: { id: approval.id, actions: r.interrupt.actions } };
  }

  /** SSE: token | tool_start | tool_end | approval_required | done | error — ปิดการเชื่อมต่อ = ยกเลิกงานของ agent */
  @Post("chat/stream")
  async stream(@CurrentUser() user: PublicUser, @Param("id") id: string, @Body() body: unknown, @Res() res: Response) {
    const { message } = parseBody(ChatBody, body);
    await this.conversations.getOwned(user.id, id); // ตรวจก่อนเริ่มสตรีม: ผิดสิทธิ์ได้ 404 ปกติ
    await this.approvals.ensureChatable(user, id);
    const abort = new AbortController();
    const started = Date.now();
    let usage = { inputTokens: 0, outputTokens: 0 };
    let status = 200;
    res.on("close", () => {
      if (!res.writableFinished) abort.abort();
    });
    res.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    try {
      for await (const ev of this.agent.stream({ ctx: buildRuntimeContext(user), conversationId: id, message, signal: abort.signal })) {
        if (ev.type === "token") sse(res, "token", { text: ev.text });
        else if (ev.type === "tool_start") sse(res, "tool_start", { id: ev.id, name: ev.name, args: ev.args });
        else if (ev.type === "tool_end") sse(res, "tool_end", { id: ev.id, name: ev.name, ok: ev.ok, content: ev.content });
        else if (ev.type === "interrupt") {
          const approval = await this.approvals.create(user.id, id, ev.actions);
          sse(res, "approval_required", { approvalId: approval.id, actions: ev.actions });
          sse(res, "done", { reply: "", approvalId: approval.id });
        } else {
          usage = ev.usage;
          sse(res, "done", { reply: ev.reply, usage: ev.usage });
        }
      }
      await this.conversations.touch(id).catch(() => undefined);
    } catch (e) {
      if (!abort.signal.aborted) {
        const pub = classifyError(e);
        status = pub.status;
        sse(res, "error", { statusCode: pub.status, message: pub.message }); // ไม่ส่ง err.message ดิบ (อาจมี key/path)
      }
    } finally {
      await this.usage.record({ userId: user.id, route: "POST /conversations/:id/chat/stream", status, ms: Date.now() - started, ...usage });
      res.end();
    }
  }

  /** คำขออนุมัติที่ยังค้าง — ใช้แสดง dialog ซ้ำหลังโหลดหน้าใหม่ */
  @Get("approvals")
  async pending(@CurrentUser() user: PublicUser, @Param("id") id: string) {
    await this.conversations.getOwned(user.id, id);
    return (await this.approvals.listPending(user.id, id)).map((a) => ({ id: a.id, status: a.status, actions: a.actions, createdAt: a.createdAt }));
  }

  @Post("approvals/:approvalId")
  @HttpCode(200)
  async decide(@CurrentUser() user: PublicUser, @Param("id") id: string, @Param("approvalId") approvalId: string, @Body() body: unknown) {
    const decision = parseBody(DecisionBody, body);
    await this.conversations.getOwned(user.id, id);
    const result = await this.approvals.decide(user, id, approvalId, decision);
    return { reply: result.reply, toolCalls: result.toolCalls, usage: result.usage, ...(result.approval ? { approval: result.approval } : {}) };
  }
}
