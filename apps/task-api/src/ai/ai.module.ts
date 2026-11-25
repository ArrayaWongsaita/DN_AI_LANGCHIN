import { Module } from "@nestjs/common";
import { MCP_TOOLS, createMcpTools } from "../mcp/mcp-tools.js";
import { UsageModule } from "../usage/usage.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { TasksModule } from "../tasks/tasks.module.js";
import { AgentService } from "./agent.service.js";
import { ChatController } from "./chat.controller.js";
import { chatModelProvider } from "./model.provider.js";

/** AI module — รวมทุกอย่างของ agent ไว้ที่เดียว ส่วนอื่นของแอปไม่ต้องรู้จัก LangChain */
@Module({ imports: [TasksModule, AuthModule, UsageModule],
  controllers: [ChatController],
  providers: [chatModelProvider, { provide: MCP_TOOLS, useFactory: () => (process.env.MCP_ENABLED === "true" ? createMcpTools : null) }, AgentService], exports: [AgentService] })
export class AiModule {}
