import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

export interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  user: { id: string };
}

/**
 * ⚠️ ชั่วคราว (ใช้ก่อนมีระบบ login ใน 19-07): อ่าน user id จาก header `x-dev-user-id` แล้วเช็คว่ามีในฐานข้อมูล
 * ห้ามใช้ใน production — header ปลอมได้ทั้งหมด จะถูกแทนด้วย JWT guard
 */
@Injectable()
export class DevUserGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const id = req.headers["x-dev-user-id"];
    if (typeof id !== "string" || !id) throw new UnauthorizedException("ต้องระบุผู้ใช้");
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } }).catch(() => null);
    if (!user) throw new UnauthorizedException("ไม่พบผู้ใช้");
    req.user = { id: user.id };
    return true;
  }
}
