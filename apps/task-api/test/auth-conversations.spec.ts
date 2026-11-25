import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import { bearer, call, hasDb, makeApp, registerUser } from "./helpers.js";
import { AIMessage } from "@langchain/core/messages";

describe.skipIf(!hasDb)("19-07…19-09 auth, user-scoped tools, conversations", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let a: Awaited<ReturnType<typeof registerUser>>;
  let b: Awaited<ReturnType<typeof registerUser>>;

  beforeAll(async () => {
    ctx = await makeApp();
    a = await registerUser(ctx.http(), "alice");
    b = await registerUser(ctx.http(), "bob");
  });
  afterAll(async () => {
    await ctx.prisma.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    await ctx.app.close();
  });

  describe("auth", () => {
    test("register returns 201 + token + user without a password hash", () => {
      expect(a.status).toBe(201);
      expect(a.token).toBeTruthy();
      expect(a.body.user).toMatchObject({ name: "alice", email: a.email });
      expect(JSON.stringify(a.body)).not.toMatch(/passwordHash|correct-horse/);
    });

    test("the password is stored hashed (never plain text)", async () => {
      const row = await ctx.prisma.user.findUniqueOrThrow({ where: { id: a.id } });
      expect(row.passwordHash).not.toContain("correct-horse-1");
      expect(row.passwordHash.startsWith("scrypt$")).toBe(true);
    });

    test("duplicate email → 409", async () => {
      const res = await request(ctx.http()).post("/auth/register").send({ name: "x", email: a.email, password: "another-pass-1" });
      expect(res.status).toBe(409);
    });

    test("short password / bad email → 400", async () => {
      expect((await request(ctx.http()).post("/auth/register").send({ name: "x", email: "e@x.io", password: "short" })).status).toBe(400);
      expect((await request(ctx.http()).post("/auth/register").send({ name: "x", email: "nope", password: "long-enough-1" })).status).toBe(400);
    });

    test("login ok → 200 + token; wrong password and unknown email → the same 401", async () => {
      const ok = await request(ctx.http()).post("/auth/login").send({ email: a.email, password: a.password });
      expect(ok.status).toBe(200);
      expect(ok.body.token).toBeTruthy();
      const wrong = await request(ctx.http()).post("/auth/login").send({ email: a.email, password: "wrong-password" });
      const unknown = await request(ctx.http()).post("/auth/login").send({ email: "nobody@test.local", password: "wrong-password" });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body.message).toBe(unknown.body.message); // ไม่บอกว่าอีเมลมีอยู่หรือไม่
    });

    test("GET /auth/me with a valid token; 401 without / forged / expired token", async () => {
      const me = await request(ctx.http()).get("/auth/me").set(bearer(a.token));
      expect(me.status).toBe(200);
      expect(me.body).toMatchObject({ id: a.id, email: a.email, role: "user" });
      expect((await request(ctx.http()).get("/auth/me")).status).toBe(401);
      expect((await request(ctx.http()).get("/auth/me").set(bearer("not.a.jwt"))).status).toBe(401);
      const forged = await ctx.jwt.signAsync({ sub: a.id, role: "admin" }, { secret: "x".repeat(32) });
      expect((await request(ctx.http()).get("/auth/me").set(bearer(forged))).status).toBe(401);
      const expired = await ctx.jwt.signAsync({ sub: a.id }, { expiresIn: "-60s" });
      expect((await request(ctx.http()).get("/auth/me").set(bearer(expired))).status).toBe(401);
    });

    test("role in the token is NOT trusted: an admin claim for a normal user is read from the database", async () => {
      const token = await ctx.jwt.signAsync({ sub: a.id, role: "admin", locale: "en" });
      const me = await request(ctx.http()).get("/auth/me").set(bearer(token));
      expect(me.body.role).toBe("user");
    });
  });

  describe("conversations (user-scoped)", () => {
    let convA: string;

    test("create / list only my own conversations", async () => {
      const created = await request(ctx.http()).post("/conversations").set(bearer(a.token)).send({ title: "งานของ alice" });
      expect(created.status).toBe(201);
      convA = created.body.id;
      await request(ctx.http()).post("/conversations").set(bearer(b.token)).send({});
      const listA = await request(ctx.http()).get("/conversations").set(bearer(a.token));
      expect(listA.body.map((c: { id: string }) => c.id)).toEqual([convA]);
    });

    test("user B gets 404 for A's conversation, its messages, chat and delete (nothing deleted)", async () => {
      expect((await request(ctx.http()).get(`/conversations/${convA}`).set(bearer(b.token))).status).toBe(404);
      expect((await request(ctx.http()).get(`/conversations/${convA}/messages`).set(bearer(b.token))).status).toBe(404);
      ctx.useScript(new AIMessage("ไม่ควรถึงตรงนี้"));
      expect((await request(ctx.http()).post(`/conversations/${convA}/chat`).set(bearer(b.token)).send({ message: "hi" })).status).toBe(404);
      expect((await request(ctx.http()).delete(`/conversations/${convA}`).set(bearer(b.token))).status).toBe(404);
      expect((await request(ctx.http()).get(`/conversations/${convA}`).set(bearer(a.token))).status).toBe(200);
    });

    test("requests without a token → 401", async () => {
      expect((await request(ctx.http()).get("/conversations")).status).toBe(401);
      expect((await request(ctx.http()).post(`/conversations/${convA}/chat`).send({ message: "hi" })).status).toBe(401);
    });

    test("chat creates a task for the TOKEN user even if the model passes another userId in the tool args", async () => {
      ctx.useScript(call("c1", "createTask", { title: "ซื้อกาแฟ", userId: b.id }), new AIMessage("เพิ่มแล้ว"));
      const res = await request(ctx.http()).post(`/conversations/${convA}/chat`).set(bearer(a.token)).send({ message: "เพิ่มงาน ซื้อกาแฟ" });
      expect(res.status).toBe(200);
      expect(res.body.reply).toBe("เพิ่มแล้ว");
      expect(await ctx.prisma.task.count({ where: { userId: a.id, title: "ซื้อกาแฟ" } })).toBe(1);
      expect(await ctx.prisma.task.count({ where: { userId: b.id } })).toBe(0);
    });

    test("messages are read from the checkpointer in order (human, ai tool call, tool, ai)", async () => {
      const res = await request(ctx.http()).get(`/conversations/${convA}/messages`).set(bearer(a.token));
      expect(res.status).toBe(200);
      expect(res.body.map((m: { role: string }) => m.role)).toEqual(["human", "ai", "tool", "ai"]);
      expect(res.body[1].toolCalls[0].name).toBe("createTask");
      expect(res.body[3].text).toBe("เพิ่มแล้ว");
    });

    test("toolCalls in a reply cover only THIS turn, not earlier turns of the thread", async () => {
      const conv = (await request(ctx.http()).post("/conversations").set(bearer(a.token)).send({})).body.id;
      ctx.useScript(call("t1", "createTask", { title: "รอบแรก" }), new AIMessage("ok1"));
      await request(ctx.http()).post(`/conversations/${conv}/chat`).set(bearer(a.token)).send({ message: "เพิ่มงาน" });
      ctx.useScript(call("t2", "getTasks"), new AIMessage("ok2"));
      const second = await request(ctx.http()).post(`/conversations/${conv}/chat`).set(bearer(a.token)).send({ message: "ดูงาน" });
      expect(second.body.toolCalls.map((t: { name: string }) => t.name)).toEqual(["getTasks"]);
    });

    test("the same conversation id under another user's thread is a different, empty thread (namespaced by userId)", async () => {
      const convB = (await request(ctx.http()).post("/conversations").set(bearer(b.token)).send({})).body.id;
      const res = await request(ctx.http()).get(`/conversations/${convB}/messages`).set(bearer(b.token));
      expect(res.body).toEqual([]);
    });

    test("delete my own conversation → 204 and it is gone", async () => {
      expect((await request(ctx.http()).delete(`/conversations/${convA}`).set(bearer(a.token))).status).toBe(204);
      expect((await request(ctx.http()).get(`/conversations/${convA}`).set(bearer(a.token))).status).toBe(404);
    });

    test("empty message → 400", async () => {
      const conv = (await request(ctx.http()).post("/conversations").set(bearer(a.token)).send({})).body.id;
      expect((await request(ctx.http()).post(`/conversations/${conv}/chat`).set(bearer(a.token)).send({ message: "  " })).status).toBe(400);
    });
  });
});
