import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

/** spec ที่ใช้ฐานข้อมูลจริง: ถ้าไม่มี/ต่อไม่ได้ จะถูกข้ามพร้อมข้อความที่บอกวิธีแก้ (ไม่ crash) */
export async function dbAvailable(): Promise<boolean> {
  const url = process.env.TASK_API_DATABASE_URL;
  if (!url) return false;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, connectionTimeoutMillis: 2000 }) });
  try {
    await prisma.$queryRaw`select 1`;
    await prisma.user.count(); // ตารางต้องมีแล้ว (รัน migrate)
    return true;
  } catch {
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

export const hasDb = await dbAvailable();
if (!hasDb) console.warn("⚠️  ข้าม spec ที่ใช้ฐานข้อมูล: รัน `pnpm db:up` (root) → `pnpm --filter task-api db:create && pnpm --filter task-api migrate` และตั้ง TASK_API_DATABASE_URL");

export const uniqueEmail = (label = "u") => `${label}-${randomUUID().slice(0, 8)}@test.local`;

// ---------- app helper สำหรับ spec ระดับ HTTP (ใช้ฐานข้อมูลจริง + model ปลอม) ----------
import { AIMessage } from "@langchain/core/messages";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AgentService } from "../src/ai/agent.service.js";
import { SummaryService } from "../src/ai/summary.service.js";
import { CHAT_MODEL } from "../src/ai/model.provider.js";
import { AppModule } from "../src/app.module.js";
import { createScriptedChatModel } from "../src/shared/scripted-model.js";

export const call = (id: string, name: string, args: Record<string, unknown> = {}) =>
  new AIMessage({ content: "", tool_calls: [{ id, name, args }] });

export async function makeApp(options: { mcp?: boolean } = {}) {
  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CHAT_MODEL)
    .useFactory({ factory: () => createScriptedChatModel([]) });
  if (options.mcp) builder = builder.overrideProvider(MCP_TOOLS).useValue(createMcpTools);
  const mod = await builder.compile();
  const app = mod.createNestApplication();
  await app.init();
  const agent = app.get(AgentService);
  /** ตั้งสคริปต์ของ model ปลอมสำหรับเทสต์ถัดไป (คืน model เพื่อดู calls) */
  const useScript = (...script: AIMessage[]) => {
    const model = createScriptedChatModel(script);
    (agent as unknown as { model: unknown }).model = model;
    (app.get(SummaryService) as unknown as { model: unknown }).model = model;
    return model;
  };
  return { app, mod, agent, prisma: app.get(PrismaServiceRef), jwt: app.get(JwtService), useScript, http: () => app.getHttpServer() };
}

import { PrismaService as PrismaServiceRef } from "../src/prisma/prisma.service.js";

/** สมัครผู้ใช้ผ่าน API จริง แล้วคืน token + id */
export async function registerUser(http: any, label = "u", password = "correct-horse-1") {
  const email = uniqueEmail(label);
  const res = await request(http).post("/auth/register").send({ name: label, email, password });
  return { email, password, token: res.body.token as string, id: res.body.user?.id as string, status: res.status, body: res.body };
}
export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

import { MCP_TOOLS, createMcpTools } from "../src/mcp/mcp-tools.js";
