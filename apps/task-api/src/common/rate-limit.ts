import { HttpException } from "@nestjs/common";

/** หน้าต่างเลื่อน (sliding window) ต่อ key — เก็บเฉพาะเวลาของคำขอที่ "ผ่าน" คำขอที่ถูกบล็อกไม่ต่อโทษ */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  hit(key: string, now = Date.now()): { allowed: true } | { allowed: false; retryAfterSec: number } {
    const recent = (this.hits.get(key) ?? []).filter((t) => t > now - this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((recent[0]! + this.windowMs - now) / 1000)) };
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(now); // กัน Map โตไม่จำกัด
    return { allowed: true };
  }

  private prune(now: number) {
    for (const [k, v] of this.hits) if (v.every((t) => t <= now - this.windowMs)) this.hits.delete(k);
  }
}

export class RateLimitedException extends HttpException {
  constructor(readonly retryAfterSec: number) {
    super(`ส่งคำขอถี่เกินไป กรุณารออีก ${retryAfterSec} วินาทีแล้วลองใหม่`, 429);
  }
}
