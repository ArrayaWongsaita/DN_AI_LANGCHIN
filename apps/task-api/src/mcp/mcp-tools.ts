import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { MCPAdapter } from "@langchain/mcp-adapters";

/** token สำหรับฉีด factory ที่โหลด MCP tools ของผู้ใช้ (null = ปิด MCP) */
export const MCP_TOOLS = Symbol("MCP_TOOLS");

export interface McpToolset {
  tools: StructuredToolInterface[];
  close(): Promise<void>;
}
export type McpToolsFactory = (userId: string) => Promise<McpToolset>;

const serverFile = fileURLToPath(new URL("./task-mcp-server.ts", import.meta.url));

/**
 * spawn MCP server (stdio) ที่ผูกกับผู้ใช้คนเดียวผ่าน env แล้วแปลง tool เป็น LangChain tools
 * ชื่อ tool ขึ้นต้นด้วยชื่อ server (`tasks_list_tasks`) — ผู้เรียกต้อง `close()` เสมอ
 */
export const createMcpTools: McpToolsFactory = async (userId) => {
  const tsxLoader = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;
  const adapter = new MCPAdapter({
    servers: {
      tasks: {
        command: process.execPath,
        args: ["--import", tsxLoader, serverFile],
        env: { PATH: process.env.PATH ?? "", TASK_API_DATABASE_URL: process.env.TASK_API_DATABASE_URL ?? "", TASK_MCP_USER_ID: userId },
      },
    },
  });
  try {
    return { tools: (await adapter.listTools()) as unknown as StructuredToolInterface[], close: () => adapter.close() };
  } catch (e) {
    await adapter.close().catch(() => undefined);
    throw e;
  }
};
