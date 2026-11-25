import { MemorySaver } from "@langchain/langgraph";
import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { TasksService } from "../src/tasks/tasks.service.js";
import { bearer, call, hasDb, makeApp, registerUser } from "./helpers.js";

/** ทุก tool call ของ AI message ต้องมี ToolMessage ตอบกลับ (provider จริงตอบ 400 INVALID_TOOL_RESULTS ถ้าไม่มี) */
const dangling = (msgs: BaseMessage[]) => {
  const answered = new Set(msgs.filter((m) => m.getType() === "tool").map((m) => (m as unknown as { tool_call_id: string }).tool_call_id));
  return msgs.flatMap((m) => ((m as AIMessage).tool_calls ?? []).map((c) => c.id!)).filter((id) => !answered.has(id));
};

describe.skipIf(!hasDb)("final review fixes — conversations must never get stuck", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let a: Awaited<ReturnType<typeof registerUser>>;
  const api = () => ({
    conv: async () => (await request(ctx.http()).post("/conversations").set(bearer(a.token)).send({})).body.id as string,
    chat: (id: string, message = "hi") => request(ctx.http()).post(`/conversations/${id}/chat`).set(bearer(a.token)).send({ message }),
    decide: (id: string, approvalId: string, decision = "approve") => request(ctx.http()).post(`/conversations/${id}/approvals/${approvalId}`).set(bearer(a.token)).send({ decision }),
    pending: (id: string) => request(ctx.http()).get(`/conversations/${id}/approvals?status=pending`).set(bearer(a.token)),
  });
  const mk = (title: string) => ctx.prisma.task.create({ data: { userId: a.id, title } });

  beforeAll(async () => {
    ctx = await makeApp();
    a = await registerUser(ctx.http(), "fin-a");
  });
  afterAll(async () => {
    await ctx.prisma.auditLog.deleteMany({ where: { userId: a.id } });
    await ctx.prisma.user.deleteMany({ where: { id: a.id } });
    await ctx.app.close();
  });

  test("C1: approving the 1st delete when the model then asks to delete a 2nd → a NEW approval is returned and stored; approving it deletes it; chat works", async () => {
    const t1 = await mk("งาน A");
    const t2 = await mk("งาน B");
    const c = await api().conv();
    ctx.useScript(call("d1", "deleteTask", { id: t1.id }), call("d2", "deleteTask", { id: t2.id }), new AIMessage("ลบครบแล้ว"), new AIMessage("ยินดีครับ"));
    const first = await api().chat(c, "ลบ A และ B");
    expect(first.body.approval).toBeTruthy();
    const second = await api().decide(c, first.body.approval.id);
    expect(second.status).toBe(200);
    expect(second.body.approval?.actions?.[0]).toMatchObject({ name: "deleteTask", args: { id: t2.id } });
    expect((await api().pending(c)).body).toHaveLength(1);
    expect(await ctx.prisma.task.count({ where: { id: t2.id } })).toBe(1); // ยังไม่ลบจนกว่าจะอนุมัติ
    expect((await api().chat(c)).status).toBe(409); // ยังมีคำขอค้าง
    const done = await api().decide(c, second.body.approval.id);
    expect(done.body.reply).toBe("ลบครบแล้ว");
    expect(await ctx.prisma.task.count({ where: { id: { in: [t1.id, t2.id] } } })).toBe(0);
    expect((await api().chat(c)).status).toBe(200);
  });

  test("C2a: parallel calls above the tool-call cap → blocked calls get error ToolMessages, so the next message is valid", async () => {
    ctx.agent.limits = { modelCalls: 12, toolCalls: 1 };
    const c = await api().conv();
    const two = new AIMessage({ content: "", tool_calls: [{ id: "p1", name: "getTasks", args: {} }, { id: "p2", name: "getTasks", args: {} }] });
    const model = ctx.useScript(two, new AIMessage("เสร็จ"), new AIMessage("ตอบต่อได้"));
    const res = await api().chat(c, "ดูงานสองรอบ");
    ctx.agent.limits = undefined;
    expect(res.status).toBe(200);
    const next = await api().chat(c, "ต่อ");
    expect(next.status).toBe(200);
    expect(dangling(model.seenMessages.at(-1)!)).toEqual([]);
  });

  test("C2b: client disconnects mid-tool → the thread is repaired before the next message (no dangling tool call reaches the model)", async () => {
    const tasks = ctx.app.get(TasksService);
    const realList = tasks.list.bind(tasks);
    tasks.list = (async (...args: Parameters<typeof realList>) => {
      await new Promise((r) => setTimeout(r, 300));
      return realList(...args);
    }) as typeof tasks.list;
    const c = await api().conv();
    ctx.useScript(call("s1", "getTasks"), new AIMessage("ไม่ควรถึง"));
    await ctx.app.listen(0);
    const url = await ctx.app.getUrl();
    const abort = new AbortController();
    const res = await fetch(`${url}/conversations/${c}/chat/stream`, { method: "POST", headers: { ...bearer(a.token), "content-type": "application/json" }, body: JSON.stringify({ message: "ดูงาน" }), signal: abort.signal });
    const reader = res.body!.getReader();
    await reader.read();
    abort.abort();
    await reader.cancel().catch(() => undefined);
    await new Promise((r) => setTimeout(r, 600));
    tasks.list = realList;
    const model = ctx.useScript(new AIMessage("กลับมาคุยต่อได้"));
    const next = await api().chat(c, "ต่อ");
    expect(next.status).toBe(200);
    expect(next.body.reply).toBe("กลับมาคุยต่อได้");
    expect(dangling(model.seenMessages[0]!)).toEqual([]);
  });

  test("I2: the tool already deleted but the model call after it failed → 503 Thai message says it WAS done, approval is decided, audit written, chat works", async () => {
    const t = await mk("ลบแล้วแต่ model ล้ม");
    const c = await api().conv();
    ctx.useScript(call("d1", "deleteTask", { id: t.id })); // script หมดหลัง resume → model throw
    const first = await api().chat(c, "ลบ");
    const res = await api().decide(c, first.body.approval.id);
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/ทำรายการแล้ว/);
    expect(await ctx.prisma.task.count({ where: { id: t.id } })).toBe(0);
    const row = await ctx.prisma.approval.findUniqueOrThrow({ where: { id: first.body.approval.id } });
    expect(row.status).toBe("decided");
    expect(await ctx.prisma.auditLog.count({ where: { userId: a.id, action: "approval.approve", detail: { path: ["approvalId"], equals: row.id } } })).toBe(1);
    ctx.useScript(new AIMessage("ปกติแล้ว"));
    expect((await api().chat(c)).status).toBe(200);
  });

  test("I1: checkpoint lost (restart) while an approval is pending → approve gives 409 Thai, nothing deleted, approval closed, conversation usable again", async () => {
    const t = await mk("รีสตาร์ทตอนรออนุมัติ");
    const c = await api().conv();
    ctx.useScript(call("d1", "deleteTask", { id: t.id }));
    const first = await api().chat(c, "ลบ");
    (ctx.agent as unknown as { checkpointer: MemorySaver }).checkpointer = new MemorySaver(); // จำลอง process รีสตาร์ท
    const res = await api().decide(c, first.body.approval.id);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/หมดอายุ|รีสตาร์ท/);
    expect(await ctx.prisma.task.count({ where: { id: t.id } })).toBe(1);
    expect((await ctx.prisma.approval.findUniqueOrThrow({ where: { id: first.body.approval.id } })).status).not.toMatch(/pending|resolving/);
    ctx.useScript(new AIMessage("ใช้ต่อได้"));
    expect((await api().chat(c)).status).toBe(200);
  });

  test("I2b: a multi-action approval writes an audit row for EVERY action", async () => {
    const t1 = await mk("หลายรายการ 1");
    const t2 = await mk("หลายรายการ 2");
    const c = await api().conv();
    const both = new AIMessage({ content: "", tool_calls: [{ id: "m1", name: "deleteTask", args: { id: t1.id } }, { id: "m2", name: "deleteTask", args: { id: t2.id } }] });
    ctx.useScript(both, new AIMessage("ลบทั้งสอง"));
    const first = await api().chat(c, "ลบสองงาน");
    expect((await api().decide(c, first.body.approval.id)).status).toBe(200);
    const audits = await ctx.prisma.auditLog.findMany({ where: { userId: a.id, action: "approval.approve", detail: { path: ["approvalId"], equals: first.body.approval.id } } });
    expect(audits.map((x) => (x.detail as { taskId: string }).taskId).sort()).toEqual([t1.id, t2.id].sort());
  });
});

describe.skipIf(!hasDb)("I3: one rate-limit budget per user across all routes; /auth is limited per IP", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  beforeAll(async () => {
    process.env.RATE_LIMIT_PER_MIN = "3";
    process.env.AUTH_RATE_LIMIT_PER_MIN = "5";
    ctx = await makeApp();
  });
  afterAll(async () => {
    process.env.RATE_LIMIT_PER_MIN = "1000";
    process.env.AUTH_RATE_LIMIT_PER_MIN = "1000";
    await ctx.app.close();
  });

  test("3 requests spread over /documents, /conversations and /summaries exhaust ONE budget; the 4th is 429", async () => {
    const u = await registerUser(ctx.http(), "rl"); // 1 hit บน /auth (IP)
    const get = (p: string) => request(ctx.http()).get(p).set(bearer(u.token));
    expect((await get("/documents")).status).toBe(200);
    const conv = await request(ctx.http()).post("/conversations").set(bearer(u.token)).send({});
    expect(conv.status).toBe(201);
    expect((await get("/preferences")).status).toBe(200); // ไม่อยู่ในงบ: ไม่ใช้ guard นี้
    ctx.useScript(new AIMessage("ตอบ"));
    expect((await request(ctx.http()).post(`/conversations/${conv.body.id}/chat`).set(bearer(u.token)).send({ message: "hi" })).status).toBe(200); // controller อื่น แต่ใช้งบเดียวกัน
    expect((await get("/documents")).status).toBe(200); // ครั้งที่ 3 ของงบ 3
    const blocked = await get("/documents");
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeTruthy();
    await ctx.prisma.user.delete({ where: { id: u.id } });
  });

  test("login attempts are limited per IP (guessing passwords / burning scrypt)", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) statuses.push((await request(ctx.http()).post("/auth/login").send({ email: "nobody@test.local", password: "wrong-password-1" })).status);
    expect(statuses).toContain(429);
    expect(statuses[0]).toBe(401);
  });
});

describe.skipIf(!hasDb)("I4: due dates are strict", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let a: Awaited<ReturnType<typeof registerUser>>;
  beforeAll(async () => {
    ctx = await makeApp();
    a = await registerUser(ctx.http(), "dd");
  });
  afterAll(async () => {
    await ctx.prisma.user.delete({ where: { id: a.id } });
    await ctx.app.close();
  });
  const post = (dueDate: string) => request(ctx.http()).post("/tasks").set(bearer(a.token)).send({ title: "t", dueDate });

  test.each(["Dec 5", "1", "5/12/2026", "2026-12-01T23:30", "2026-02-31", "tomorrow"])("%s → 400", async (v) => {
    expect((await post(v)).status).toBe(400);
  });
  test.each([["2026-12-05", "2026-12-05"], ["2026-12-05T10:00:00+07:00", "2026-12-05"], ["2026-12-05T20:00:00Z", "2026-12-06"]])("%s → %s (Bangkok calendar day)", async (v, day) => {
    const res = await post(v);
    expect(res.status).toBe(201);
    expect(String(res.body.dueDate).slice(0, 10)).toBe(day);
  });
});
