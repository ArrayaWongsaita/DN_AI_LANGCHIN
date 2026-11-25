import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtGuard } from "./jwt.guard.js";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({ secret: config.jwtSecret, signOptions: { expiresIn: "15m", algorithm: "HS256" } }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard],
  exports: [AuthService, JwtGuard, JwtModule],
})
export class AuthModule {}
