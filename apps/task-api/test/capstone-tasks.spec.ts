import { AIMessage } from "@langchain/core/messages";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { TasksService } from "../src/tasks/tasks.service.js";
import { bearer, call, hasDb, makeApp, registerUser } from "./helpers.js";

describe.skipIf(!hasDb)("milestone 02/04 — tasks API, Bangkok dates, full tool set", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let a: Awaited<ReturnType<typeof registerUser>>;
  let b: Awaited<ReturnType<typeof registerUser>>;
  let tasks: TasksService;
  const api = (u = a) => ({
    get: (p: string) => request(ctx.http()).get(p).set(bearer(u.token)),
    post: (p: string, body: object) => request(ctx.http()).post(p).set(bearer(u.token)).send(body),
    patch: (p: string, body: object) => request(ctx.http()).patch(p).set(bearer(u.token)).send(body),
    del: (p: string) => request(ctx.http()).delete(p).set(bearer(u.token)),
  });

  beforeAll(async () => {
    ctx = await makeApp();
    tasks = ctx.app.get(TasksService);
    a = await registerUser(ctx.http(), "cap-a");
    b = await registerUser(ctx.http(), "cap-b");
  });
  afterAll(async () => {
    await ctx.prisma.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    await ctx.app.close();
  });

  describe("REST /tasks", () => {
    let id: string;
    test("auth required", async () => {
      expect((await request(ctx.http()).get("/tasks")).status).toBe(401);
    });
    test("POST creates (201), validates input (400)", async () => {
      const ok = await api().post("/tasks", { title: "  อ่านหนังสือ TypeScript  ", priority: "High", dueDate: "2026-12-01" });
      expect(ok.status).toBe(201);
      expect(ok.body).toMatchObject({ title: "อ่านหนังสือ TypeScript", priority: "High", status: "Pending" });
      id = ok.body.id;
      expect((await api().post("/tasks", { title: "" })).status).toBe(400);
      expect((await api().post("/tasks", { title: "x", priority: "urgent" })).status).toBe(400);
      expect((await api().post("/tasks", { title: "x", dueDate: "พรุ่งนี้" })).status).toBe(400);
    });
    test("GET /tasks/:id, PATCH, and another user gets 404 for all verbs (nothing changes)", async () => {
      expect((await api().get(`/tasks/${id}`)).body.title).toBe("อ่านหนังสือ TypeScript");
      expect((await api().patch(`/tasks/${id}`, { status: "InProgress" })).body.status).toBe("InProgress");
      expect((await api(b).get(`/tasks/${id}`)).status).toBe(404);
      expect((await api(b).patch(`/tasks/${id}`, { title: "hack" })).status).toBe(404);
      expect((await api(b).del(`/tasks/${id}`)).status).toBe(404);
      expect((await api().get(`/tasks/${id}`)).body.title).toBe("อ่านหนังสือ TypeScript");
      expect((await api().patch(`/tasks/${id}`, {})).status).toBe(400);
      expect((await api().get("/tasks/not-a-uuid")).status).toBe(404);
    });
    test("list shows only my tasks; filter by status/priority; search by text; overdue/today flags", async () => {
      await api(b).post("/tasks", { title: "งานลับของ B ภาษาไทย" });
      await api().post("/tasks", { title: "เขียน Backend API", priority: "Low" });
      await api().post("/tasks", { title: "ประชุมทีม", description: "เรื่อง backend ใหม่", dueDate: "2020-01-01" });
      const all = (await api().get("/tasks")).body as { title: string }[];
      expect(all.map((t) => t.title)).not.toContain("งานลับของ B ภาษาไทย");
      expect((await api().get("/tasks?status=InProgress")).body).toHaveLength(1);
      expect((await api().get("/tasks?priority=Low")).body.map((t: { title: string }) => t.title)).toEqual(["เขียน Backend API"]);
      expect((await api().get("/tasks?q=backend")).body.map((t: { title: string }) => t.title).sort()).toEqual(["ประชุมทีม", "เขียน Backend API"]);
      expect((await api().get("/tasks?overdue=true")).body.map((t: { title: string }) => t.title)).toEqual(["ประชุมทีม"]);
      expect((await api().get("/tasks?status=bogus")).status).toBe(400);
    });
    test("GET /tasks/summary counts only my tasks", async () => {
      const s = (await api().get("/tasks/summary")).body;
      expect(s.total).toBe(3);
      expect(s.byStatus).toMatchObject({ Pending: 2, InProgress: 1, Completed: 0 });
      expect(s.overdue).toBe(1);
    });
    test("DELETE removes my task (204)", async () => {
      const t = (await api().post("/tasks", { title: "ลบเอง" })).body;
      expect((await api().del(`/tasks/${t.id}`)).status).toBe(204);
      expect((await api().get(`/tasks/${t.id}`)).status).toBe(404);
    });
  });

  describe("dates follow Asia/Bangkok", () => {
    test("at 2026-11-25T18:00Z it is already 26 Nov in Bangkok: 'today' and 'overdue' use the Bangkok calendar day", async () => {
      const u = await registerUser(ctx.http(), "tz");
      const now = new Date("2026-11-25T18:00:00Z");
      await tasks.create(u.id, { title: "วันนี้(26)", dueDate: "2026-11-26" });
      await tasks.create(u.id, { title: "เมื่อวาน(25)", dueDate: "2026-11-25" });
      await tasks.create(u.id, { title: "พรุ่งนี้(27)", dueDate: "2026-11-27" });
      await tasks.create(u.id, { title: "ไม่มีกำหนด" });
      expect((await tasks.listToday(u.id, now)).map((t) => t.title)).toEqual(["วันนี้(26)"]);
      expect((await tasks.listOverdue(u.id, now)).map((t) => t.title)).toEqual(["เมื่อวาน(25)"]);
      const before = new Date("2026-11-25T16:00:00Z"); // 25 Nov 23:00 Bangkok → "today" คือ 25
      expect((await tasks.listToday(u.id, before)).map((t) => t.title)).toEqual(["เมื่อวาน(25)"]);
      await ctx.prisma.user.delete({ where: { id: u.id } });
    });
    test("a full ISO datetime is normalised to its Bangkok calendar date", async () => {
      const u = await registerUser(ctx.http(), "tz2");
      const t = await tasks.create(u.id, { title: "iso", dueDate: "2026-11-25T18:30:00Z" }); // = 26 Nov 01:30 Bangkok
      expect(t.dueDate!.toISOString().slice(0, 10)).toBe("2026-11-26");
      await ctx.prisma.user.delete({ where: { id: u.id } });
    });
  });

  describe("agent tools (scripted model through the real HTTP chat)", () => {
    let conv: string;
    const names = (r: { body: { toolCalls: { name: string }[] } }) => r.body.toolCalls.map((t) => t.name);
    const chat = (text: string, u = a) => request(ctx.http()).post(`/conversations/${conv}/chat`).set(bearer(u.token)).send({ message: text });

    beforeAll(async () => {
      conv = (await api().post("/conversations", {})).body.id;
    });

    test("every capstone tool is available and works on my data", async () => {
      const t = await tasks.create(a.id, { title: "งานทดสอบ tool" });
      ctx.useScript(
        call("1", "getTasks", { status: "Pending" }),
        call("2", "getTaskById", { id: t.id }),
        call("3", "searchTasks", { query: "ทดสอบ" }),
        call("4", "getTodayTasks"),
        call("5", "getOverdueTasks"),
        call("6", "getTaskSummary"),
        call("7", "changeTaskPriority", { id: t.id, priority: "High" }),
        call("8", "changeTaskDueDate", { id: t.id, dueDate: "2026-12-05" }),
        call("9", "updateTask", { id: t.id, title: "งานทดสอบ tool (แก้)" }),
        call("10", "completeTask", { id: t.id }),
        new AIMessage("เสร็จ"),
      );
      const res = await chat("ทดสอบทุก tool");
      expect(res.status).toBe(200);
      expect(names(res)).toEqual(["getTasks", "getTaskById", "searchTasks", "getTodayTasks", "getOverdueTasks", "getTaskSummary", "changeTaskPriority", "changeTaskDueDate", "updateTask", "completeTask"]);
      const row = await ctx.prisma.task.findUniqueOrThrow({ where: { id: t.id } });
      expect(row).toMatchObject({ title: "งานทดสอบ tool (แก้)", priority: "High", status: "Completed" });
      expect(row.dueDate!.toISOString().slice(0, 10)).toBe("2026-12-05");
    });

    test("write tools reject invalid input (nothing written) and the agent keeps going", async () => {
      const before = await ctx.prisma.task.count({ where: { userId: a.id } });
      ctx.useScript(
        call("v1", "createTask", { title: "   " }),
        call("v2", "createTask", { title: "x", priority: "urgent" }),
        call("v3", "createTask", { title: "x", dueDate: "พรุ่งนี้" }),
        new AIMessage("มีข้อผิดพลาด"),
      );
      const res = await chat("เพิ่มงานผิดๆ");
      expect(res.status).toBe(200);
      expect(res.body.reply).toBe("มีข้อผิดพลาด");
      expect(await ctx.prisma.task.count({ where: { userId: a.id } })).toBe(before);
    });

    test("write tools cannot touch another user's task id (data unchanged), errors do not crash the run", async () => {
      const bt = await tasks.create(b.id, { title: "ของ B", priority: "Low" });
      conv = (await api().post("/conversations", {})).body.id; // บทสนทนาใหม่ (ของเดิมยาวจนเริ่มสรุปประวัติ)
      ctx.useScript(
        call("x1", "updateTask", { id: bt.id, title: "hijack" }),
        call("x2", "completeTask", { id: bt.id }),
        call("x3", "changeTaskPriority", { id: bt.id, priority: "High" }),
        call("x4", "changeTaskDueDate", { id: bt.id, dueDate: "2030-01-01" }),
        call("x5", "getTaskById", { id: bt.id }),
        new AIMessage("ไม่พบงาน"),
      );
      const res = await chat("แก้งานของคนอื่น");
      expect(res.status).toBe(200);
      const row = await ctx.prisma.task.findUniqueOrThrow({ where: { id: bt.id } });
      expect(row).toMatchObject({ title: "ของ B", priority: "Low", status: "Pending", dueDate: null });
      const msgs = (await api().get(`/conversations/${conv}/messages`)).body as { role: string; text: string }[];
      expect(msgs.filter((m) => m.role === "tool").slice(-5).every((m) => /ไม่พบงาน|ล้มเหลว/.test(m.text))).toBe(true);
    });

    test("deleteTask is the only tool that pauses for approval", async () => {
      const t = await tasks.create(a.id, { title: "รออนุมัติ" });
      ctx.useScript(call("d1", "deleteTask", { id: t.id }), new AIMessage("ลบแล้ว"));
      const res = await chat("ลบงานนี้");
      expect(res.body.approval.actions[0]).toMatchObject({ name: "deleteTask" });
      expect(await ctx.prisma.task.count({ where: { id: t.id } })).toBe(1);
    });
  });
});
