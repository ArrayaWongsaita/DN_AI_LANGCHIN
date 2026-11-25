import { Module } from "@nestjs/common";
import { AiModule } from "./ai/ai.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { TasksModule } from "./tasks/tasks.module.js";

@Module({ imports: [PrismaModule, TasksModule, AiModule] })
export class AppModule {}
