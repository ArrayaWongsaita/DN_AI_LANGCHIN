import { Module } from "@nestjs/common";
import { AiModule } from "./ai/ai.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { ConversationsModule } from "./conversations/conversations.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { TasksModule } from "./tasks/tasks.module.js";

@Module({ imports: [PrismaModule, AuthModule, TasksModule, AiModule, ConversationsModule] })
export class AppModule {}
