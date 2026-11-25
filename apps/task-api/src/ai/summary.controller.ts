import { Controller, Get, Inject, UseGuards, UseInterceptors } from "@nestjs/common";
import type { PublicUser } from "../auth/auth.service.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtGuard } from "../auth/jwt.guard.js";
import { RateLimitGuard } from "../common/rate-limit.guard.js";
import { UsageInterceptor } from "../usage/usage.interceptor.js";
import { SummaryService } from "./summary.service.js";

@Controller("summaries")
@UseGuards(JwtGuard, RateLimitGuard)
@UseInterceptors(UsageInterceptor)
export class SummaryController {
  constructor(@Inject(SummaryService) private readonly summaries: SummaryService) {}

  @Get("weekly")
  weekly(@CurrentUser() user: PublicUser) {
    return this.summaries.weekly(user.id);
  }
}
