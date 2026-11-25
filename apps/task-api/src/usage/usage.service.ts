import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

export interface UsageRecord {
  userId: string;
  route: string;
  status: number;
  ms: number;
  inputTokens?: number;
  outputTokens?: number;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger("Usage");
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** บันทึกไม่สำเร็จต้องไม่ทำให้คำขอของผู้ใช้ล้ม */
  async record(r: UsageRecord): Promise<void> {
    try {
      await this.prisma.usageLog.create({ data: { ...r, inputTokens: r.inputTokens ?? 0, outputTokens: r.outputTokens ?? 0 } });
    } catch (e) {
      this.logger.warn(`บันทึก usage ไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
