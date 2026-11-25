import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { RateLimitedException, SlidingWindowLimiter } from "./rate-limit.js";

/**
 * limiter ต้องเป็น "ตัวเดียวต่อ process" — Nest สร้าง guard ใหม่ต่อ controller/module ถ้าเก็บ limiter ในตัว guard
 * ผู้ใช้จะได้งบแยกต่อ route (20 × จำนวน controller) แทนที่จะเป็น 20 รวมกัน
 * ⚠️ อยู่ในหน่วยความจำของ process เดียว: หลาย instance ต้องย้ายไป Redis หรือ gateway
 */
const limiters = new Map<string, SlidingWindowLimiter>();
const shared = (kind: string, limit: number) => {
  const key = `${kind}:${limit}`;
  let l = limiters.get(key);
  if (!l) limiters.set(key, (l = new SlidingWindowLimiter(limit, 60_000)));
  return l;
};

type Req = { user?: { id: string }; ip?: string };

/** จำนวนคำขอต่อ "ผู้ใช้" ต่อนาที (ค่าเริ่มต้น 20) รวมทุก route — ต้องวางหลัง JwtGuard เพื่อรู้ว่าใคร */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly limiter: SlidingWindowLimiter;
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.limiter = shared("user", config.rateLimitPerMin);
  }
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Req>();
    const result = this.limiter.hit(req.user?.id ?? req.ip ?? "anonymous");
    if (!result.allowed) throw new RateLimitedException(result.retryAfterSec);
    return true;
  }
}

/** /auth/* ยังไม่รู้ว่าใคร → จำกัดตาม IP (กันเดารหัสผ่านและการเผา CPU ของ scrypt) */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly limiter: SlidingWindowLimiter;
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.limiter = shared("auth", config.authRateLimitPerMin);
  }
  canActivate(context: ExecutionContext): boolean {
    const result = this.limiter.hit(context.switchToHttp().getRequest<Req>().ip ?? "unknown");
    if (!result.allowed) throw new RateLimitedException(result.retryAfterSec);
    return true;
  }
}
