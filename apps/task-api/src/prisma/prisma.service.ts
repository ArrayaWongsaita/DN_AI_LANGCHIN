import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { PrismaClient } from "../generated/prisma/client.js";

/** Prisma 7 ต้องส่ง driver adapter (pg) เข้า PrismaClient — ผูกกับ lifecycle ของ Nest เพื่อปิด connection ตอนปิดแอป */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
