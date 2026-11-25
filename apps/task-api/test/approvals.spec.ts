import { AIMessage } from "@langchain/core/messages";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { bearer, call, hasDb, makeApp, registerUser } from "./helpers.js";

describe.skipIf(!hasDb)("19-11 approval endpoint (human-in-the-loop)", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let a: Awaited<ReturnType<typeof registerUser>>;
  let b: Awaited<ReturnType<typeof registerUser>>;

  const newConv = async (u = a) => (await request(ctx.http()).post("/conversations").set(bearer(u.token)).send({})).body.id as string;
  const mkTask = (userId: string, title: string) => ctx.prisma.task.create({ data: { userId, title } });
  /** สั่งลบ → agent หยุดรออนุมัติ → คืนคำขออนุมัติ */
  let lastConv = "";
  // แต่ละคำขอใช้บทสนทนาใหม่: บทสนทนาที่ยังมีคำขออนุมัติค้างอยู่รับข้อความใหม่ไม่ได้ (409) — ดู describe ท้ายไฟล์
  async function askToDelete(taskId: string, u = a, conversationId?: string, extraArgs: Record<string, unknown> = {}) {
    lastConv = conversationId ?? (await newConv(u));
    ctx.useScript(call("d1", "deleteTask", { id: taskId, ...extraArgs }), new AIMessage("ลบแล้ว"));
    return request(ctx.http()).post(`/conversations/${lastConv}/chat`).set(bearer(u.token)).send({ message: "ลบงานนี้" });
  }
  const decide = (approvalId: string, body: object, u = a, conversationId = lastConv) =>
    request(ctx.http()).post(`/conversations/${conversationId}/approvals/${approvalId}`).set(bearer(u.token)).send(body);

  beforeAll(async () => {
    ctx = await makeApp();
    a = await registerUser(ctx.http(), "appr-a");
    b = await registerUser(ctx.http(), "appr-b");
  });
  afterAll(async () => {
    await ctx.prisma.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    await ctx.prisma.auditLog.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await ctx.app.close();
  });

  test("a delete request pauses the agent: approval_required in the response, task still exists", async () => {
    const t = await mkTask(a.id, "งานที่จะลบ");
    const res = await askToDelete(t.id);
    expect(res.status).toBe(200);
    expect(res.body.approval).toMatchObject({ actions: [{ name: "deleteTask", args: { id: t.id } }] });
    expect(res.body.approval.id).toBeTruthy();
    expect(await ctx.prisma.task.count({ where: { id: t.id } })).toBe(1);
  });

  test("approve → the task is deleted, the agent replies, an audit row is written", async () => {
    const t = await mkTask(a.id, "ลบจริง");
    const { body } = await askToDelete(t.id);
    const res = await decide(body.approval.id, { decision: "approve" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("ลบแล้ว");
    expect(await ctx.prisma.task.count({ where: { id: t.id } })).toBe(0);
    const audit = await ctx.prisma.auditLog.findMany({ where: { userId: a.id, action: "approval.approve" } });
    expect(audit.length).toBeGreaterThanOrEqual(1);
  });

  test("calling the endpoint twice → the second call returns the first result and deletes once", async () => {
    const t = await mkTask(a.id, "ลบครั้งเดียว");
    const { body } = await askToDelete(t.id);
    const first = await decide(body.approval.id, { decision: "approve" });
    const model = ctx.useScript(); // ถ้าคำขอที่สองไปเรียก model/agent อีก จะ throw (สคริปต์ว่าง)
    const second = await decide(body.approval.id, { decision: "approve" });
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(model.calls).toBe(0);
    expect(await ctx.prisma.auditLog.count({ where: { userId: a.id, action: "approval.approve", detail: { path: ["taskId"], equals: t.id } } })).toBe(1);
  });

  test("two concurrent decisions → exactly one execution", async () => {
    const t = await mkTask(a.id, "แข่งกัน");
    const { body } = await askToDelete(t.id);
    const [r1, r2] = await Promise.all([decide(body.approval.id, { decision: "approve" }), decide(body.approval.id, { decision: "approve" })]);
    expect([r1.status, r2.status].filter((s) => s === 200).length).toBeGreaterThanOrEqual(1);
    expect(await ctx.prisma.auditLog.count({ where: { userId: a.id, action: "approval.approve", detail: { path: ["taskId"], equals: t.id } } })).toBe(1);
  });

  test("reject → the task stays and the agent is told", async () => {
    const t = await mkTask(a.id, "ไม่ลบ");
    const { body } = await askToDelete(t.id);
    ctx.useScript(new AIMessage("ยกเลิกการลบแล้ว"));
    const res = await decide(body.approval.id, { decision: "reject" });
    expect(res.status).toBe(200);
    expect(await ctx.prisma.task.count({ where: { id: t.id } })).toBe(1);
  });

  test("edit → runs with the edited args (a different task of mine)", async () => {
    const t1 = await mkTask(a.id, "เดิม");
    const t2 = await mkTask(a.id, "ที่แก้ให้ลบแทน");
    const { body } = await askToDelete(t1.id);
    ctx.useScript(new AIMessage("ลบงานที่แก้แล้ว"));
    const res = await decide(body.approval.id, { decision: "edit", args: { id: t2.id } });
    expect(res.status).toBe(200);
    expect(await ctx.prisma.task.count({ where: { id: t1.id } })).toBe(1);
    expect(await ctx.prisma.task.count({ where: { id: t2.id } })).toBe(0);
  });

  test("approve after the task was removed meanwhile → 409 with a Thai message, nothing deleted", async () => {
    const t = await mkTask(a.id, "หายไปก่อน");
    const { body } = await askToDelete(t.id);
    await ctx.prisma.task.delete({ where: { id: t.id } });
    const res = await decide(body.approval.id, { decision: "approve" });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ไม่มีอยู่แล้ว|ไม่พบ/);
    expect(await ctx.prisma.auditLog.count({ where: { userId: a.id, action: "approval.approve", detail: { path: ["taskId"], equals: t.id } } })).toBe(0);
  });

  test("user B cannot decide A's approval (404) and B's task cannot be deleted by A through the model", async () => {
    const t = await mkTask(a.id, "ของ A");
    const { body } = await askToDelete(t.id);
    expect((await decide(body.approval.id, { decision: "approve" }, b, lastConv)).status).toBe(404);
    expect(await ctx.prisma.task.count({ where: { id: t.id } })).toBe(1);

    const bTask = await mkTask(b.id, "ของ B");
    const sneaky = await askToDelete(bTask.id, a, undefined, { userId: b.id }); // model พยายามลบงานของ B (และส่ง userId ของ B)
    const res = await decide(sneaky.body.approval.id, { decision: "approve" });
    expect(res.status).toBe(409);
    expect(await ctx.prisma.task.count({ where: { id: bTask.id } })).toBe(1);
  });

  test("an approval id from another conversation is 404", async () => {
    const t = await mkTask(a.id, "คนละบทสนทนา");
    const { body } = await askToDelete(t.id);
    const other = await newConv();
    expect((await decide(body.approval.id, { decision: "approve" }, a, other)).status).toBe(404);
  });

  test("invalid decision body → 400", async () => {
    const t = await mkTask(a.id, "body ผิด");
    const { body } = await askToDelete(t.id);
    expect((await decide(body.approval.id, { decision: "maybe" })).status).toBe(400);
    expect((await decide(body.approval.id, { decision: "edit" })).status).toBe(400); // edit ต้องมี args
  });

  describe("a conversation with an approval pending (found by the live run)", () => {
    test("a new chat message while an approval is pending → 409, the model is not called, and after deciding the chat works again", async () => {
      const c = await newConv();
      const t = await mkTask(a.id, "ค้างรออนุมัติ");
      const asked = await askToDelete(t.id, a, c);
      const model = ctx.useScript(new AIMessage("ไม่ควรถึง"));
      const blocked = await request(ctx.http()).post(`/conversations/${c}/chat`).set(bearer(a.token)).send({ message: "ขอถามอย่างอื่น" });
      expect(blocked.status).toBe(409);
      expect(blocked.body.message).toMatch(/อนุมัติ/);
      expect(model.calls).toBe(0);
      const stream = await request(ctx.http()).post(`/conversations/${c}/chat/stream`).set(bearer(a.token)).send({ message: "อื่นๆ" });
      expect(stream.status).toBe(409);

      ctx.useScript(new AIMessage("ลบแล้ว"));
      expect((await decide(asked.body.approval.id, { decision: "approve" }, a, c)).status).toBe(200);
      ctx.useScript(new AIMessage("ว่าไงครับ"));
      const ok = await request(ctx.http()).post(`/conversations/${c}/chat`).set(bearer(a.token)).send({ message: "สวัสดี" });
      expect(ok.status).toBe(200);
      expect(ok.body.reply).toBe("ว่าไงครับ");
    });

    test("GET /conversations/:id/approvals?status=pending lists the pending requests (own conversation only)", async () => {
      const c = await newConv();
      const t = await mkTask(a.id, "ต้องแสดงใน dialog");
      const asked = await askToDelete(t.id, a, c);
      const list = await request(ctx.http()).get(`/conversations/${c}/approvals?status=pending`).set(bearer(a.token));
      expect(list.status).toBe(200);
      expect(list.body).toEqual([expect.objectContaining({ id: asked.body.approval.id, status: "pending", actions: [expect.objectContaining({ name: "deleteTask" })] })]);
      expect((await request(ctx.http()).get(`/conversations/${c}/approvals?status=pending`).set(bearer(b.token))).status).toBe(404);
      ctx.useScript(new AIMessage("ปฏิเสธแล้ว"));
      await decide(asked.body.approval.id, { decision: "reject" }, a, c);
      expect((await request(ctx.http()).get(`/conversations/${c}/approvals?status=pending`).set(bearer(a.token))).body).toEqual([]);
    });

    test("after a stale approval (task vanished → 409) the conversation is NOT left stuck: chat works again", async () => {
      const c = await newConv();
      const t = await mkTask(a.id, "หายระหว่างรอ");
      const asked = await askToDelete(t.id, a, c);
      await ctx.prisma.task.delete({ where: { id: t.id } });
      ctx.useScript(new AIMessage("ไม่ได้ลบ เพราะงานไม่มีอยู่แล้ว")); // ผลของการ resume แบบ reject เพื่อปิด thread ให้สะอาด
      expect((await decide(asked.body.approval.id, { decision: "approve" }, a, c)).status).toBe(409);
      // thread ต้องไม่เหลือ tool call ที่ไม่มีผลลัพธ์ (provider จริงจะตอบ 400 INVALID_TOOL_RESULTS)
      const msgs = (await request(ctx.http()).get(`/conversations/${c}/messages`).set(bearer(a.token))).body as { role: string; toolCalls?: unknown[] }[];
      const calls = msgs.flatMap((m) => m.toolCalls ?? []).length;
      expect(msgs.filter((m) => m.role === "tool").length).toBe(calls);
      ctx.useScript(new AIMessage("กลับมาคุยต่อได้"));
      const next = await request(ctx.http()).post(`/conversations/${c}/chat`).set(bearer(a.token)).send({ message: "ต่อ" });
      expect(next.status).toBe(200);
      expect(next.body.reply).toBe("กลับมาคุยต่อได้");
    });
  });
});
