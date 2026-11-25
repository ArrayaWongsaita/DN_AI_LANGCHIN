import { ConflictException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
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

export const PENDING_MESSAGE = "มีคำขออนุมัติที่ค้างอยู่ในบทสนทนานี้ กรุณาอนุมัติหรือปฏิเสธก่อนส่งข้อความใหม่";
export type DecisionResult = AgentRunResult & { approval?: { id: string; actions: PendingAction[] } };

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

  /**
   * ตรวจ thread ก่อนรับข้อความใหม่ ให้แน่ใจว่าส่งต่อให้ provider ได้จริง:
   * - มีคำขอค้าง → 409 (ถ้า thread หยุดรออนุมัติแต่ไม่มีแถว Approval เช่นสตรีมถูกตัดตอน interrupt มา → สร้างให้ แล้ว 409)
   * - มี tool call ที่ไม่มีผลลัพธ์ (ตัดสาย/ชนเพดาน) → ปิดด้วย ToolMessage "ยกเลิก" แล้วไปต่อ
   */
  async ensureChatable(user: PublicUser, conversationId: string): Promise<void> {
    if (await this.hasOpen(conversationId)) throw new ConflictException(PENDING_MESSAGE);
    const st = await this.agent.threadStatus(user.id, conversationId);
    if (st.interrupt) {
      await this.create(user.id, conversationId, st.interrupt);
      throw new ConflictException(PENDING_MESSAGE);
    }
    await this.agent.cancelDangling(user.id, conversationId, st.dangling);
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
  async decide(user: PublicUser, conversationId: string, approvalId: string, body: DecisionBody): Promise<DecisionResult> {
    const approval = await this.find(user.id, conversationId, approvalId);
    if (approval.status === "decided") return approval.result as unknown as DecisionResult;
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
          if (marked.count === 1) await this.prisma.auditLog.create({ data: { userId: user.id, conversationId, action: "approval.stale", detail: { approvalId: approval.id, tool: a.name, args: a.args } as unknown as Prisma.InputJsonValue } });
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
      if (again.status === "decided") return again.result as unknown as DecisionResult;
      throw new ConflictException("คำขอนี้กำลังถูกประมวลผลหรือถูกตัดสินแล้ว");
    }

    const decisions: ApprovalDecision[] =
      body.decision === "approve"
        ? actions.map(() => ({ type: "approve" as const }))
        : body.decision === "edit"
          ? [{ type: "edit", editedAction: { name: target.name, args: target.args } }]
          : actions.map(() => ({ type: "reject" as const, message: "ผู้ใช้ปฏิเสธการทำรายการนี้" }));

    const executed = body.decision === "edit" ? [target] : actions;
    const auditRows = (extra: Record<string, unknown> = {}) =>
      executed.map((a) => ({
        userId: user.id,
        conversationId,
        action: `approval.${body.decision}`,
        detail: { approvalId: approval.id, tool: a.name, args: a.args, taskId: typeof a.args.id === "string" ? a.args.id : null, ...extra } as unknown as Prisma.InputJsonValue,
      }));

    let result: AgentRunResult;
    try {
      result = await this.agent.resume({ ctx: buildRuntimeContext(user), conversationId, decisions });
    } catch (e) {
      const st = await this.agent.threadStatus(user.id, conversationId).catch(() => null);
      if (st && !st.interrupt && st.empty) {
        // checkpoint หาย (รีสตาร์ท) → ยังไม่มีอะไรถูกรัน ปิดคำขอแทนที่จะล็อกบทสนทนาไว้ตลอดไป
        await this.prisma.approval.updateMany({ where: { id: approval.id, status: "resolving" }, data: { status: "stale", decision: body.decision, decidedAt: new Date() } });
        throw new ConflictException("คำขอนี้หมดอายุ (ระบบรีสตาร์ทระหว่างรอ) ไม่ได้ทำรายการ — ลองสั่งใหม่อีกครั้ง");
      }
      if (st && !st.interrupt) {
        // thread ผ่านจุดอนุมัติไปแล้ว: tool ถูกรันจริง แต่ขั้นถัดไป (เช่นเรียก model) ล้ม — ห้ามให้ลองซ้ำหรือบอกว่า "ไม่ได้ทำ"
        const failed = { reply: "", usage: { inputTokens: 0, outputTokens: 0 }, toolCalls: [], resumeFailed: true };
        await this.prisma.$transaction([
          this.prisma.approval.update({ where: { id: approval.id }, data: { status: "decided", decision: body.decision, result: failed as unknown as Prisma.InputJsonValue, decidedAt: new Date() } }),
          this.prisma.auditLog.createMany({ data: auditRows({ resumeFailed: true }) }),
        ]);
        this.logger.error(`resume ล้มหลังทำรายการแล้ว: ${e instanceof Error ? e.message : String(e)}`);
        throw new ServiceUnavailableException(body.decision === "reject" ? "บันทึกการปฏิเสธแล้ว แต่ AI ตอบกลับไม่สำเร็จ" : "ทำรายการแล้ว แต่ AI ตอบกลับไม่สำเร็จ — ตรวจสอบรายการงานของคุณ อย่าสั่งซ้ำ");
      }
      await this.prisma.approval.updateMany({ where: { id: approval.id, status: "resolving" }, data: { status: "pending" } }); // ยังหยุดรออยู่ที่เดิม ให้ลองใหม่ได้
      throw e;
    }

    // agent ขอทำรายการที่ต้องอนุมัติต่อ (เช่นลบชิ้นถัดไป) → ต้องมีแถวคำขอใหม่ ไม่เช่นนั้นผู้ใช้อนุมัติไม่ได้และ thread ค้าง
    const next = result.interrupt ? await this.create(user.id, conversationId, result.interrupt.actions) : null;
    const decided: DecisionResult = { ...result, ...(next ? { approval: { id: next.id, actions: result.interrupt!.actions } } : {}) };
    await this.prisma.$transaction([
      this.prisma.approval.update({ where: { id: approval.id }, data: { status: "decided", decision: body.decision, result: decided as unknown as Prisma.InputJsonValue, decidedAt: new Date() } }),
      this.prisma.auditLog.createMany({ data: auditRows() }),
    ]);
    return decided;
  }
}
