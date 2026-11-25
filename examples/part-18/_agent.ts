// ตัวช่วยของตัวอย่าง Part 18 (ขึ้นต้นด้วย _ จึงไม่อยู่ใน `pnpm play`)
import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { z } from "zod";
import { TaskStore, createTaskTools } from "../../src/data/tasks.js";
import { createApprovalMiddleware, createAuditMiddleware, createRoleBasedToolMiddleware, createToolErrorMiddleware, type AuditEntry } from "../../src/middleware/index.js";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

const contextSchema = z.object({ userId: z.string(), role: z.enum(["viewer", "editor", "admin"]), name: z.string() });

/** agent เดียวกับ Part 17 แต่รับ model จากข้างนอก — เทสต์ส่ง scripted model, ตัวอย่างจริงส่ง model จริง */
export function buildTaskAgent(model: BaseChatModel, store = new TaskStore(), opts: { systemPrompt?: string } = {}) {
  const audit: AuditEntry[] = [];
  const agent = createAgent({
    model,
    tools: createTaskTools(store),
    contextSchema,
    systemPrompt: opts.systemPrompt,
    checkpointer: new MemorySaver(),
    middleware: [
      createToolErrorMiddleware(),
      createAuditMiddleware(audit),
      createRoleBasedToolMiddleware(),
      ...createApprovalMiddleware({ requireFor: ["deleteTask"] }),
    ],
  });
  return { agent, store, audit };
}

export const adminContext = { userId: "u1", role: "admin" as const, name: "สมชาย" };
