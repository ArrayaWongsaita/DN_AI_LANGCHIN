import { Body, Controller, Get, HttpCode, Inject, Post, UseGuards } from "@nestjs/common";
import { AuthRateLimitGuard } from "../common/rate-limit.guard.js";
import { parseBody } from "../common/zod.js";
import { AuthService, LoginInput, RegisterInput, type PublicUser } from "./auth.service.js";
import { CurrentUser } from "./current-user.decorator.js";
import { JwtGuard } from "./jwt.guard.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("register")
  @UseGuards(AuthRateLimitGuard)
  register(@Body() body: unknown) {
    return this.auth.register(parseBody(RegisterInput, body));
  }

  @Post("login")
  @UseGuards(AuthRateLimitGuard)
  @HttpCode(200)
  login(@Body() body: unknown) {
    return this.auth.login(parseBody(LoginInput, body));
  }

  @Get("me")
  @UseGuards(JwtGuard)
  me(@CurrentUser() user: PublicUser) {
    return user;
  }
}
