import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { RateLimitedException, SlidingWindowLimiter } from "./rate-limit.js";

/**
 * จำกัดจำนวนคำขอต่อผู้ใช้ต่อนาที (ค่าเริ่มต้น 20) — ต้องวางหลัง JwtGuard เพื่อรู้ว่าใคร
 * ⚠️ เก็บในหน่วยความจำของ process เดียว: หลาย instance ต้องย้ายไป Redis หรือ gateway
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly limiter: SlidingWindowLimiter;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.limiter = new SlidingWindowLimiter(config.rateLimitPerMin, 60_000);
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: { id: string }; ip?: string }>();
    const result = this.limiter.hit(req.user?.id ?? req.ip ?? "anonymous");
    if (!result.allowed) throw new RateLimitedException(result.retryAfterSec);
    return true;
  }
}
