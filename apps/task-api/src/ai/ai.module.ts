import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { TasksModule } from "../tasks/tasks.module.js";
import { AgentService } from "./agent.service.js";
import { ChatController } from "./chat.controller.js";
import { chatModelProvider } from "./model.provider.js";

/** AI module — รวมทุกอย่างของ agent ไว้ที่เดียว ส่วนอื่นของแอปไม่ต้องรู้จัก LangChain */
@Module({ imports: [TasksModule, AuthModule], controllers: [ChatController], providers: [chatModelProvider, AgentService], exports: [AgentService] })
export class AiModule {}
