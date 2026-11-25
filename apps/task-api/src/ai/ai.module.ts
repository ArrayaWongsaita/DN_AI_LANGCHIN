import { Module } from "@nestjs/common";
import { MCP_TOOLS, createMcpTools } from "../mcp/mcp-tools.js";
import { KnowledgeModule } from "../knowledge/knowledge.module.js";
import { UsageModule } from "../usage/usage.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { TasksModule } from "../tasks/tasks.module.js";
import { InMemoryStore } from "@langchain/langgraph";
import { FALLBACK_MODEL, fallbackModelProvider } from "./model.provider.js";
import { PreferencesController } from "./preferences.controller.js";
import { STORE } from "./preferences.js";
import { SummaryController } from "./summary.controller.js";
import { SummaryService } from "./summary.service.js";
import { AgentService } from "./agent.service.js";
import { ChatController } from "./chat.controller.js";
import { chatModelProvider } from "./model.provider.js";

/** AI module — รวมทุกอย่างของ agent ไว้ที่เดียว ส่วนอื่นของแอปไม่ต้องรู้จัก LangChain */
@Module({ imports: [TasksModule, AuthModule, UsageModule, KnowledgeModule],
  controllers: [ChatController, PreferencesController, SummaryController],
  providers: [chatModelProvider, fallbackModelProvider, { provide: STORE, useFactory: () => new InMemoryStore() }, SummaryService, { provide: MCP_TOOLS, useFactory: () => (process.env.MCP_ENABLED === "true" ? createMcpTools : null) }, AgentService], exports: [AgentService, SummaryService] })
export class AiModule {}
