import { AIMessage } from "@langchain/core/messages";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { LogEvent } from "../src/ai/logging.middleware.js";
import { createScriptedChatModel } from "../src/shared/scripted-model.js";
import { TasksService } from "../src/tasks/tasks.service.js";
import { messageText } from "../src/shared/text.js";
import { bearer, call, hasDb, makeApp, registerUser } from "./helpers.js";

describe.skipIf(!hasDb)("milestones 06/08 — structured summary, preferences, middleware stack, summarization", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let a: Awaited<ReturnType<typeof registerUser>>;
  let b: Awaited<ReturnType<typeof registerUser>>;
  let tasks: TasksService;
  const newConv = async (u = a) => (await request(ctx.http()).post("/conversations").set(bearer(u.token)).send({})).body.id as string;
  const chat = (conv: string, message: string, u = a) => request(ctx.http()).post(`/conversations/${conv}/chat`).set(bearer(u.token)).send({ message });
  const agentProps = () => ctx.agent as unknown as Record<string, unknown>;

  beforeAll(async () => {
    ctx = await makeApp();
    tasks = ctx.app.get(TasksService);
    agentProps().retryOptions = { delayMs: 1 };
    a = await registerUser(ctx.http(), "agent-a");
    b = await registerUser(ctx.http(), "agent-b");
  });
  afterAll(async () => {
    await ctx.prisma.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    await ctx.app.close();
  });

  describe("structured weekly summary (milestone 06)", () => {
    const get = (u = a) => request(ctx.http()).get("/summaries/weekly").set(bearer(u.token));
    const valid = { headline: "สัปดาห์นี้มีงานเร่งด่วน 1 ชิ้น", highlights: ["เสร็จแล้ว 0 ชิ้น"], risks: ["มีงานเลยกำหนด"], nextActions: ["ส่งรายงานก่อนวันศุกร์"] };

    test("returns a Zod-validated structure and only the caller's tasks reach the model", async () => {
      await tasks.create(a.id, { title: "รายงานของ A", priority: "High", dueDate: "2020-01-01" });
      await tasks.create(b.id, { title: "ความลับของ B" });
      const model = ctx.useScript(call("w1", "weekly_summary", valid));
      const res = await get();
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ summary: valid, counts: { total: 1, overdue: 1 } });
      const prompt = model.seenMessages[0]!.map((m) => messageText(m)).join("\n");
      expect(prompt).toContain("รายงานของ A");
      expect(prompt).not.toContain("ความลับของ B");
    });

    test("an output that violates the schema is rejected (never passed on), mapped to a Thai 503", async () => {
      ctx.useScript(call("w2", "weekly_summary", { headline: "x", highlights: "ไม่ใช่ array", risks: [], nextActions: [] }));
      const res = await get();
      expect(res.status).toBe(503);
      expect(res.body.message).toMatch(/[฀-๿]/);
    });

    test("requires a token", async () => {
      expect((await request(ctx.http()).get("/summaries/weekly")).status).toBe(401);
    });
  });

  describe("preferences in the LangGraph store (milestone 08)", () => {
    const put = (key: string, value: string, u = a) => request(ctx.http()).put(`/preferences/${key}`).set(bearer(u.token)).send({ value });
    const systemPromptOf = (model: ReturnType<typeof ctx.useScript>) => messageText(model.seenMessages[0]![0]!);

    test("saved once, they reach every conversation of the same user — and nobody else's", async () => {
      expect((await put("style", "ตอบสั้นๆ เรียกฉันว่าพี่มะลิ")).status).toBe(200);
      expect((await request(ctx.http()).get("/preferences").set(bearer(a.token))).body).toEqual({ style: "ตอบสั้นๆ เรียกฉันว่าพี่มะลิ" });

      const m1 = ctx.useScript(new AIMessage("ok"));
      await chat(await newConv(), "สวัสดี");
      expect(systemPromptOf(m1)).toContain("พี่มะลิ");
      const m2 = ctx.useScript(new AIMessage("ok"));
      await chat(await newConv(), "สวัสดีอีกที"); // บทสนทนาใหม่ ผู้ใช้เดิม
      expect(systemPromptOf(m2)).toContain("พี่มะลิ");
      const m3 = ctx.useScript(new AIMessage("ok"));
      await chat(await newConv(b), "สวัสดี", b); // ผู้ใช้อื่น
      expect(systemPromptOf(m3)).not.toContain("พี่มะลิ");
      expect((await request(ctx.http()).get("/preferences").set(bearer(b.token))).body).toEqual({});
    });

    test("invalid key/value → 400; delete removes it", async () => {
      expect((await put("bad key!", "x")).status).toBe(400);
      expect((await put("style", "x".repeat(300))).status).toBe(400);
      expect((await request(ctx.http()).delete("/preferences/style").set(bearer(a.token))).status).toBe(204);
      expect((await request(ctx.http()).get("/preferences").set(bearer(a.token))).body).toEqual({});
    });

    test("the dynamic prompt also carries role/locale from the verified context (not from the model)", async () => {
      const m = ctx.useScript(new AIMessage("ok"));
      await chat(await newConv(), "hi");
      expect(systemPromptOf(m)).toMatch(/ภาษาไทย/);
      expect(systemPromptOf(m)).toMatch(/\d{4}-\d{2}-\d{2}/); // วันที่ปัจจุบัน
    });
  });

  describe("middleware stack (milestone 08)", () => {
    test("logging middleware reports model and tool phases", async () => {
      const events: LogEvent[] = [];
      agentProps().logSink = (e: LogEvent) => events.push(e);
      ctx.useScript(call("l1", "getTasks"), new AIMessage("เสร็จ"));
      await chat(await newConv(), "ดูงาน");
      expect(events.map((e) => e.phase)).toEqual(expect.arrayContaining(["before_model", "after_model", "tool"]));
      expect(events.find((e) => e.phase === "tool")).toMatchObject({ name: "getTasks" });
      agentProps().logSink = undefined;
    });

    test("tool call limit stops a runaway loop gracefully (200, bounded work)", async () => {
      agentProps().limits = { modelCalls: 20, toolCalls: 3 };
      const model = ctx.useScript(...Array.from({ length: 15 }, (_, i) => call(`r${i}`, "getTasks")), new AIMessage("ไม่ควรถึง"));
      const res = await chat(await newConv(), "วนไปเรื่อยๆ");
      expect(res.status).toBe(200);
      expect(model.calls).toBeLessThanOrEqual(5);
      expect(res.body.reply).not.toBe("ไม่ควรถึง");
      agentProps().limits = undefined;
    });

    test("model fallback: when the primary keeps failing the fallback model answers", async () => {
      const primary = ctx.useScript();
      (primary as unknown as { _generate: () => never })._generate = () => {
        throw Object.assign(new Error("overloaded"), { status: 503 });
      };
      agentProps().fallbackModel = createScriptedChatModel([new AIMessage("ตอบจากโมเดลสำรอง")]);
      const res = await chat(await newConv(), "hi");
      expect(res.status).toBe(200);
      expect(res.body.reply).toBe("ตอบจากโมเดลสำรอง");
      agentProps().fallbackModel = null;
    });

    test("transient model errors are retried by the middleware (not by an outer loop)", async () => {
      let n = 0;
      const model = ctx.useScript(new AIMessage("สำเร็จหลัง retry"));
      const real = (model as unknown as { _generate: (...a: unknown[]) => Promise<unknown> })._generate.bind(model);
      (model as unknown as { _generate: (...a: unknown[]) => Promise<unknown> })._generate = async (...args) => {
        if (n++ < 2) throw Object.assign(new Error("429 rate limit"), { status: 429 });
        return real(...args);
      };
      const res = await chat(await newConv(), "hi");
      expect(res.status).toBe(200);
      expect(res.body.reply).toBe("สำเร็จหลัง retry");
      expect(n).toBe(3);
    });
  });

  describe("summarization (milestone 08)", () => {
    test("after N messages the old ones are replaced by one summary and the last K are kept", async () => {
      agentProps().summarize = { trigger: 6, keep: 2 };
      const conv = await newConv();
      ctx.useScript(new AIMessage("r1"), new AIMessage("r2"), new AIMessage("r3"), new AIMessage("สรุป: ผู้ใช้ชื่อมะลิ ชอบกาแฟ"), new AIMessage("r4"));
      for (const text of ["ข้อความ 1", "ข้อความ 2", "ข้อความ 3", "ข้อความ 4"]) expect((await chat(conv, text)).status).toBe(200);
      const msgs = (await request(ctx.http()).get(`/conversations/${conv}/messages`).set(bearer(a.token))).body as { role: string; text: string }[];
      expect(msgs.length).toBeLessThan(8); // ไม่ใช่ 4 คู่เต็ม
      expect(msgs.some((m) => m.text.includes("ผู้ใช้ชื่อมะลิ ชอบกาแฟ"))).toBe(true); // มีสรุป
      expect(msgs.at(-1)!.text).toBe("r4");
      expect(msgs.some((m) => m.text === "ข้อความ 4")).toBe(true); // ข้อความล่าสุดยังอยู่ครบ
      expect(msgs.some((m) => m.text === "ข้อความ 1")).toBe(false); // ข้อความเก่าถูกแทนด้วยสรุป
      agentProps().summarize = undefined;
    });
  });
});
