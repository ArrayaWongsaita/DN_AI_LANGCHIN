import { type CallHandler, type ExecutionContext, HttpException, Inject, Injectable, type NestInterceptor, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { catchError, from, mergeMap, type Observable, throwError } from "rxjs";
import { UsageService } from "./usage.service.js";

interface Req {
  method: string;
  route?: { path?: string };
  user?: { id: string };
}

const SELF_RECORDED = "usage:self-recorded";
/** Marks a handler that records its own usage row (e.g. SSE, which owns the response), so the interceptor must not add a second, empty one. */
export const SelfRecordedUsage = () => SetMetadata(SELF_RECORDED, true);

/** บันทึก {userId, route, ms, token in/out} หนึ่งแถวต่อการเรียก — token อ่านจาก `usage` ในผลลัพธ์ของ agent */
@Injectable()
export class UsageInterceptor implements NestInterceptor {
  constructor(
    @Inject(UsageService) private readonly usage: UsageService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (this.reflector.get<boolean>(SELF_RECORDED, context.getHandler())) return next.handle();
    const http = context.switchToHttp();
    const req = http.getRequest<Req>();
    const start = Date.now();
    const base = () => ({ userId: req.user?.id ?? "anonymous", route: `${req.method} ${req.route?.path ?? "?"}`, ms: Date.now() - start });
    return next.handle().pipe(
      mergeMap((body: { usage?: { inputTokens: number; outputTokens: number } } | undefined) =>
        from(this.usage.record({ ...base(), status: 200, ...body?.usage }).then(() => body)),
      ),
      catchError((err) =>
        from(this.usage.record({ ...base(), status: err instanceof HttpException ? err.getStatus() : 500 })).pipe(mergeMap(() => throwError(() => err))),
      ),
    );
  }
}
