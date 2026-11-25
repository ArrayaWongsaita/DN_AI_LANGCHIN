// MCP server (stdio) ที่เปิดเผย tool "อ่านอย่างเดียว" ของงาน — รันเป็น process แยก
// ตัวตนของผู้ใช้มาจาก env `TASK_MCP_USER_ID` ที่ backend ตั้งตอน spawn เท่านั้น (client/model ระบุเองไม่ได้)
import { PrismaPg } from "@prisma/adapter-pg";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { PrismaClient } from "../generated/prisma/client.js";
import { TaskStatus } from "../tasks/task.schemas.js";
import { TasksRepository } from "../tasks/tasks.repository.js";

const userId = process.env.TASK_MCP_USER_ID;
const databaseUrl = process.env.TASK_API_DATABASE_URL;
if (!userId || !databaseUrl) {
  console.error("task-mcp-server: ต้องตั้ง TASK_MCP_USER_ID และ TASK_API_DATABASE_URL");
  process.exit(1);
}

const repo = new TasksRepository(new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) }) as never);
const show = (t: { id: string; title: string; status: string; priority: string; dueDate: Date | null }) => ({
  id: t.id,
  title: t.title,
  status: t.status,
  priority: t.priority,
  dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null,
});

const server = new McpServer({ name: "tasks", version: "1.0.0" });

server.registerTool(
  "list_tasks",
  { description: "List the current user's tasks (read-only). Optionally filter by status.", inputSchema: z.object({ status: TaskStatus.optional() }) },
  async ({ status }) => ({ content: [{ type: "text", text: JSON.stringify((await repo.list(userId, status ? { status } : {})).map(show)) }] }),
);

server.registerTool(
  "get_task",
  { description: "Get one of the current user's tasks by id (read-only).", inputSchema: z.object({ id: z.string() }) },
  async ({ id }) => {
    const task = await repo.findOwned(userId, id).catch(() => null);
    return { content: [{ type: "text", text: task ? JSON.stringify(show(task)) : "not found" }], ...(task ? {} : { isError: true }) };
  },
);

await server.connect(new StdioServerTransport());
