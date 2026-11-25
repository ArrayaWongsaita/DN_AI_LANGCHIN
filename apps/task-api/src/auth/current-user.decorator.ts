import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { PublicUser, } from "./auth.service.js";
import type { RequestWithUser } from "./jwt.guard.js";

/** ดึงผู้ใช้ที่ JwtGuard ตรวจแล้ว — ใช้เป็นแหล่งเดียวของ userId ใน controller */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): PublicUser => {
  return ctx.switchToHttp().getRequest<RequestWithUser>().user;
});
