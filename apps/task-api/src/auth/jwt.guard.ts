import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService, type PublicUser } from "./auth.service.js";

export interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  user: PublicUser;
}

/** ตรวจ `Authorization: Bearer <jwt>` แล้วแนบผู้ใช้ (จากฐานข้อมูล) ไว้ที่ request.user */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const header = req.headers.authorization;
    const [scheme, token] = typeof header === "string" ? header.split(" ") : [];
    if (scheme !== "Bearer" || !token) throw new UnauthorizedException("ต้องเข้าสู่ระบบ");
    req.user = await this.auth.verify(token);
    return true;
  }
}
