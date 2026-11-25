import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import type { Response } from "express";
import { classifyError } from "./public-error.js";
import { RateLimitedException } from "./rate-limit.js";

/** ทุก error ออกเป็น `{ statusCode, message }` ภาษาไทย — error ที่ไม่รู้จักถูก log ฝั่งเซิร์ฟเวอร์และตอบข้อความกลาง */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Errors");

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) return void res.end();

    let statusCode: number;
    let message: string;
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      const raw = typeof body === "string" ? body : (body as { message?: string | string[] }).message;
      message = Array.isArray(raw) ? raw.join("; ") : (raw ?? exception.message);
      if (exception instanceof RateLimitedException) res.setHeader("Retry-After", String(exception.retryAfterSec));
    } else {
      ({ status: statusCode, message } = classifyError(exception));
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    }
    res.status(statusCode).json({ statusCode, message });
  }
}
