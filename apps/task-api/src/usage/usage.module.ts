import { Module } from "@nestjs/common";
import { UsageInterceptor } from "./usage.interceptor.js";
import { UsageService } from "./usage.service.js";

@Module({ providers: [UsageService, UsageInterceptor], exports: [UsageService, UsageInterceptor] })
export class UsageModule {}
