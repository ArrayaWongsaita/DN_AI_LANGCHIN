import { Body, Controller, Get, HttpCode, Inject, Post, UseGuards } from "@nestjs/common";
import { parseBody } from "../common/zod.js";
import { AuthService, LoginInput, RegisterInput, type PublicUser } from "./auth.service.js";
import { CurrentUser } from "./current-user.decorator.js";
import { JwtGuard } from "./jwt.guard.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() body: unknown) {
    return this.auth.register(parseBody(RegisterInput, body));
  }

  @Post("login")
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
