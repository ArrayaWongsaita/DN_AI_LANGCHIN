import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module.js";
import { TasksModule } from "../tasks/tasks.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { ApprovalsService } from "./approvals.service.js";
import { ConversationChatController } from "./conversation-chat.controller.js";
import { ConversationsController } from "./conversations.controller.js";
import { ConversationsService } from "./conversations.service.js";

@Module({ imports: [AuthModule, AiModule, TasksModule], controllers: [ConversationsController, ConversationChatController], providers: [ConversationsService, ApprovalsService], exports: [ConversationsService] })
export class ConversationsModule {}
