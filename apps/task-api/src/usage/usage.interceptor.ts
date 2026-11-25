import { type CallHandler, type ExecutionContext, HttpException, Inject, Injectable, type NestInterceptor } from "@nestjs/common";
import { catchError, from, mergeMap, type Observable, throwError } from "rxjs";
import { UsageService } from "./usage.service.js";

interface Req {
  method: string;
  route?: { path?: string };
  user?: { id: string };
}

/** บันทึก {userId, route, ms, token in/out} หนึ่งแถวต่อการเรียก — token อ่านจาก `usage` ในผลลัพธ์ของ agent */
@Injectable()
export class UsageInterceptor implements NestInterceptor {
  constructor(@Inject(UsageService) private readonly usage: UsageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
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
