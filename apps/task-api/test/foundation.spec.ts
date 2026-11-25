import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AIMessage } from "@langchain/core/messages";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AppModule } from "../src/app.module.js";
import { AgentService } from "../src/ai/agent.service.js";
import { CHAT_MODEL } from "../src/ai/model.provider.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { createScriptedChatModel } from "../src/shared/scripted-model.js";
import { TasksService } from "../src/tasks/tasks.service.js";
import { hasDb, uniqueEmail } from "./helpers.js";

const call = (id: string, name: string, args: Record<string, unknown> = {}) => new AIMessage({ content: "", tool_calls: [{ id, name, args }] });

describe.skipIf(!hasDb)("task-api foundation (19-01 … 19-06)", () => {
  let script: AIMessage[] = [];
  let app: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>["compile"]>>;
  let prisma: PrismaService;
  let tasks: TasksService;
  let agent: AgentService;
  let userA: string;
  let userB: string;
  let nest: ReturnType<typeof app.createNestApplication>;

  beforeAll(async () => {
    app = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CHAT_MODEL)
      .useFactory({ factory: () => createScriptedChatModel(script) }) // ทุก request ใช้ model ปลอมที่ตอบตาม `script` ปัจจุบัน
      .compile();
    nest = app.createNestApplication();
    await nest.init();
    prisma = app.get(PrismaService);
    tasks = app.get(TasksService);
    agent = app.get(AgentService);
    const mk = (label: string) => prisma.user.create({ data: { name: label, email: uniqueEmail(label), passwordHash: "x" } });
    userA = (await mk("alice")).id;
    userB = (await mk("bob")).id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } }); // cascade ลบ task ด้วย
    await nest.close();
  });

  const use = (...s: AIMessage[]) => {
    script = s;
    // สร้าง model ใหม่ให้ AgentService ทุกครั้งที่เปลี่ยนสคริปต์
    (agent as unknown as { model: unknown }).model = createScriptedChatModel(script);
  };

  test("19-02 provider: CHAT_MODEL resolves to a chat model", () => {
    expect(app.get(CHAT_MODEL)).toBeDefined();
  });

  test("19-03/05 agent service creates the task for the CONTEXT user even when the model passes another userId", async () => {
    use(call("1", "createTask", { title: "ซื้อกาแฟ", userId: userB }), new AIMessage("เพิ่มแล้ว"));
    const r = await agent.run({ userId: userA, threadId: "t-foundation-1", message: "เพิ่มงาน ซื้อกาแฟ" });
    expect(r.reply).toBe("เพิ่มแล้ว");
    expect(r.toolCalls.map((c) => c.name)).toEqual(["createTask"]);
    expect((await tasks.list(userA)).map((t) => t.title)).toContain("ซื้อกาแฟ");
    expect(await tasks.list(userB)).toHaveLength(0);
  });

  test("19-06 TasksService.get(userA, taskOfB) throws NotFound (does not reveal that it exists)", async () => {
    const bTask = await tasks.create(userB, { title: "งานลับของ bob" });
    await expect(tasks.get(userA, bTask.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(tasks.update(userA, bTask.id, { title: "แก้" })).rejects.toBeInstanceOf(NotFoundException);
    await expect(tasks.remove(userA, bTask.id)).rejects.toBeInstanceOf(NotFoundException);
    expect((await tasks.get(userB, bTask.id)).title).toBe("งานลับของ bob");
  });

  test("19-05 business rules: title is trimmed, empty rejected, complete is idempotent", async () => {
    const t = await tasks.create(userA, { title: "  อ่านหนังสือ  " });
    expect(t.title).toBe("อ่านหนังสือ");
    await expect(tasks.create(userA, { title: "   " })).rejects.toThrow();
    const done1 = await tasks.complete(userA, t.id);
    const done2 = await tasks.complete(userA, t.id);
    expect(done1.status).toBe("Completed");
    expect(done2.status).toBe("Completed");
  });

  describe("19-04 POST /chat", () => {
    const post = (body: unknown, userId: string | null = userA) => {
      const r = request(nest.getHttpServer()).post("/chat");
      return (userId ? r.set("x-dev-user-id", userId) : r).send(body as object);
    };

    test("400 for an empty or missing message", async () => {
      expect((await post({ message: "" })).status).toBe(400);
      expect((await post({})).status).toBe(400);
      expect((await post({ message: "   " })).status).toBe(400);
    });

    test("400 for a malformed thread id (no namespace tricks)", async () => {
      expect((await post({ message: "สวัสดี", threadId: "../x" })).status).toBe(400);
      expect((await post({ message: "สวัสดี", threadId: "user:other:conv:1" })).status).toBe(400);
    });

    test("401 without a (dev) user", async () => {
      expect((await post({ message: "สวัสดี" }, null)).status).toBe(401);
    });

    test("200 with the model reply", async () => {
      use(new AIMessage("สวัสดีครับ"));
      const res = await post({ message: "สวัสดี", threadId: "t-foundation-http" });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ reply: "สวัสดีครับ", toolCalls: [] });
    });
  });
});
