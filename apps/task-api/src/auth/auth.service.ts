import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service.js";
import { hashPassword, verifyPassword } from "./password.js";

export const RegisterInput = z.object({
  name: z.string().trim().min(1, "ต้องระบุชื่อ").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email("อีเมลไม่ถูกต้อง")),
  password: z.string().min(8, "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร").max(200),
  locale: z.enum(["th", "en"]).default("th"),
});
export const LoginInput = z.object({ email: z.string().trim().toLowerCase(), password: z.string().min(1) });

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  locale: string;
}

const LOGIN_FAILED = "อีเมลหรือรหัสผ่านไม่ถูกต้อง"; // ข้อความเดียวกันทุกกรณี ไม่บอกว่าอีเมลมีอยู่หรือไม่
const DUMMY_HASH = hashPassword("dummy-password-for-timing"); // ให้การล็อกอินอีเมลที่ไม่มีใช้เวลาใกล้เคียงของจริง

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  private pub(u: PublicUser): PublicUser {
    return { id: u.id, name: u.name, email: u.email, role: u.role, locale: u.locale };
  }

  /** token มีแค่ sub — role/locale อ่านจากฐานข้อมูลทุกคำขอ (เปลี่ยนสิทธิ์แล้วมีผลทันที ปลอม claim ไม่ได้) */
  private token(u: PublicUser) {
    return this.jwt.signAsync({ sub: u.id });
  }

  async register(input: z.infer<typeof RegisterInput>) {
    if (await this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
      throw new ConflictException("อีเมลนี้ถูกใช้งานแล้ว");
    }
    try {
      const user = await this.prisma.user.create({
        data: { name: input.name, email: input.email, locale: input.locale, passwordHash: await hashPassword(input.password) },
      });
      return { token: await this.token(user), user: this.pub(user) };
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") throw new ConflictException("อีเมลนี้ถูกใช้งานแล้ว"); // สมัครพร้อมกัน
      throw e;
    }
  }

  async login(input: z.infer<typeof LoginInput>) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const ok = await verifyPassword(input.password, user?.passwordHash ?? (await DUMMY_HASH));
    if (!user || !ok) throw new UnauthorizedException(LOGIN_FAILED);
    return { token: await this.token(user), user: this.pub(user) };
  }

  async verify(token: string): Promise<PublicUser> {
    let sub: string | undefined;
    try {
      sub = (await this.jwt.verifyAsync<{ sub?: string }>(token)).sub;
    } catch {
      throw new UnauthorizedException("token ไม่ถูกต้องหรือหมดอายุ");
    }
    const user = sub ? await this.prisma.user.findUnique({ where: { id: sub } }) : null;
    if (!user) throw new UnauthorizedException("token ไม่ถูกต้องหรือหมดอายุ");
    return this.pub(user);
  }
}
