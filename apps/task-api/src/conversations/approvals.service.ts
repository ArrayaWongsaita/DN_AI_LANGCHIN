import { ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { AgentService, type AgentRunResult, type PendingAction } from "../ai/agent.service.js";
import type { ApprovalDecision } from "../ai/approval.middleware.js";
import { buildRuntimeContext } from "../ai/runtime-context.js";
import type { PublicUser } from "../auth/auth.service.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { TasksService } from "../tasks/tasks.service.js";

export const DecisionBody = z
  .object({ decision: z.enum(["approve", "reject", "edit"], { error: "decision ต้องเป็น approve | reject | edit" }), args: z.record(z.string(), z.unknown()).optional() })
  .refine((v) => v.decision !== "edit" || v.args, { message: "decision=edit ต้องส่ง args ที่แก้แล้ว" });
export type DecisionBody = z.infer<typeof DecisionBody>;

const STALE_MESSAGE = "งานนี้ไม่มีอยู่แล้ว (หรือไม่ใช่ของคุณ) จึงไม่ได้ทำรายการ — ไม่มีอะไรถูกลบ";

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger("Approvals");

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AgentService) private readonly agent: AgentService,
    @Inject(TasksService) private readonly tasks: TasksService,
  ) {}

  /** บันทึกคำขอที่ agent หยุดรอ (ผู้เรียกตรวจเจ้าของ conversation แล้ว) */
  create(userId: string, conversationId: string, actions: PendingAction[]) {
    return this.prisma.approval.create({ data: { userId, conversationId, actions: actions as unknown as Prisma.InputJsonValue } });
  }

  /** มีคำขอที่ยังไม่ถูกตัดสินอยู่ไหม — ถ้ามี thread จะหยุดค้างที่ tool call ที่ยังไม่มีผลลัพธ์ ห้ามส่งข้อความใหม่เข้าไป (provider จะตอบ 400) */
  async hasOpen(conversationId: string): Promise<boolean> {
    return (await this.prisma.approval.count({ where: { conversationId, status: { in: ["pending", "resolving"] } } })) > 0;
  }

  listPending(userId: string, conversationId: string) {
    return this.prisma.approval.findMany({ where: { userId, conversationId, status: "pending" }, orderBy: { createdAt: "asc" } });
  }

  private async find(userId: string, conversationId: string, id: string) {
    const approval = await this.prisma.approval.findFirst({ where: { id, conversationId, userId } }).catch(() => null);
    if (!approval) throw new NotFoundException("ไม่พบคำขออนุมัติ");
    return approval;
  }

  /** ตัดสินใจ "ครั้งเดียว": เรียกซ้ำได้ผลลัพธ์เดิม, เรียกพร้อมกันรันครั้งเดียว, ตรวจเจ้าของ/ข้อมูลซ้ำก่อนรันจริง */
  async decide(user: PublicUser, conversationId: string, approvalId: string, body: DecisionBody): Promise<AgentRunResult> {
    const approval = await this.find(user.id, conversationId, approvalId);
    if (approval.status === "decided") return approval.result as unknown as AgentRunResult;
    if (approval.status === "stale") throw new ConflictException(STALE_MESSAGE);
    if (approval.status === "resolving") throw new ConflictException("คำขอนี้กำลังถูกประมวลผล ลองใหม่อีกครั้ง");

    const actions = approval.actions as unknown as PendingAction[];
    if (body.decision === "edit" && actions.length !== 1) throw new ConflictException("แก้ไขได้เฉพาะคำขอที่มี 1 การกระทำ");
    const target = body.decision === "edit" ? { ...actions[0]!, args: body.args! } : actions[0]!;

    // ตรวจซ้ำก่อนรัน: งานต้องยังมีอยู่และเป็นของผู้ใช้ (เวลาผ่านไประหว่างรออนุมัติ)
    if (body.decision !== "reject") {
      for (const a of body.decision === "edit" ? [target] : actions) {
        const id = a.args.id;
        const ok = typeof id === "string" && (await this.tasks.get(user.id, id).then(() => true, () => false));
        if (!ok) {
          const marked = await this.prisma.approval.updateMany({ where: { id: approval.id, status: "pending" }, data: { status: "stale", decision: body.decision, decidedAt: new Date() } });
          // thread ยังค้างรออนุมัติ → ปิดด้วยการ "ปฏิเสธ" เพื่อไม่ให้บทสนทนาใช้ต่อไม่ได้ (ทำครั้งเดียวโดยผู้ที่เปลี่ยนสถานะสำเร็จ)
          if (marked.count === 1) {
            await this.agent
              .resume({ ctx: buildRuntimeContext(user), conversationId, decisions: actions.map(() => ({ type: "reject" as const, message: "งานไม่มีอยู่แล้ว จึงไม่ได้ทำรายการ" })) })
              .catch((e) => this.logger.warn(`ปิด thread ที่ค้างไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`));
          }
          throw new ConflictException(STALE_MESSAGE);
        }
      }
    }

    // claim แบบ atomic: มีผู้ชนะคนเดียว
    const claimed = await this.prisma.approval.updateMany({ where: { id: approval.id, status: "pending" }, data: { status: "resolving" } });
    if (claimed.count === 0) {
      const again = await this.find(user.id, conversationId, approvalId);
      if (again.status === "decided") return again.result as unknown as AgentRunResult;
      throw new ConflictException("คำขอนี้กำลังถูกประมวลผลหรือถูกตัดสินแล้ว");
    }

    const decisions: ApprovalDecision[] =
      body.decision === "approve"
        ? actions.map(() => ({ type: "approve" as const }))
        : body.decision === "edit"
          ? [{ type: "edit", editedAction: { name: target.name, args: target.args } }]
          : actions.map(() => ({ type: "reject" as const, message: "ผู้ใช้ปฏิเสธการทำรายการนี้" }));

    let result: AgentRunResult;
    try {
      result = await this.agent.resume({ ctx: buildRuntimeContext(user), conversationId, decisions });
    } catch (e) {
      await this.prisma.approval.updateMany({ where: { id: approval.id, status: "resolving" }, data: { status: "pending" } }); // ให้ลองใหม่ได้
      throw e;
    }
    await this.prisma.$transaction([
      this.prisma.approval.update({ where: { id: approval.id }, data: { status: "decided", decision: body.decision, result: result as unknown as Prisma.InputJsonValue, decidedAt: new Date() } }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          conversationId,
          action: `approval.${body.decision}`,
          detail: { approvalId: approval.id, tool: target.name, args: target.args, taskId: typeof target.args.id === "string" ? target.args.id : null } as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);
    return result;
  }
}
