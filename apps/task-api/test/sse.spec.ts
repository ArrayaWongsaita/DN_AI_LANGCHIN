import { AIMessage } from "@langchain/core/messages";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { TasksService } from "../src/tasks/tasks.service.js";
import { bearer, call, hasDb, makeApp, registerUser } from "./helpers.js";

interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}
const parse = (raw: string): SseEvent[] =>
  raw
    .split("\n\n")
    .filter(Boolean)
    .map((block) => {
      const event = /^event: (.*)$/m.exec(block)![1]!;
      const data = JSON.parse(/^data: (.*)$/m.exec(block)![1]!);
      return { event, data };
    });

describe.skipIf(!hasDb)("19-10 SSE streaming", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let a: Awaited<ReturnType<typeof registerUser>>;
  let conv: string;

  beforeAll(async () => {
    ctx = await makeApp();
    a = await registerUser(ctx.http(), "sse");
    conv = (await request(ctx.http()).post("/conversations").set(bearer(a.token)).send({})).body.id;
  });
  afterAll(async () => {
    await ctx.prisma.user.deleteMany({ where: { id: a.id } });
    await ctx.app.close();
  });

  test("emits ordered events: tool_start → tool_end → token(s) → done, as text/event-stream", async () => {
    ctx.useScript(call("s1", "createTask", { title: "สตรีม" }), new AIMessage("เพิ่มงานแล้ว"));
    const res = await request(ctx.http())
      .post(`/conversations/${conv}/chat/stream`)
      .set(bearer(a.token))
      .send({ message: "เพิ่มงาน สตรีม" })
      .buffer(true)
      .parse((r, cb) => {
        let d = "";
        r.setEncoding("utf8");
        r.on("data", (c: string) => (d += c));
        r.on("end", () => cb(null, d));
      });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
    const events = parse(res.body as string);
    const names = events.map((e) => e.event);
    expect(names[0]).toBe("tool_start");
    expect(names.indexOf("tool_end")).toBeGreaterThan(names.indexOf("tool_start"));
    expect(names.indexOf("token")).toBeGreaterThan(names.indexOf("tool_end"));
    expect(names.at(-1)).toBe("done");
    expect(events[0]!.data).toMatchObject({ name: "createTask" });
    expect(events.filter((e) => e.event === "token").map((e) => e.data.text).join("")).toBe("เพิ่มงานแล้ว");
    expect(events.at(-1)!.data).toMatchObject({ reply: "เพิ่มงานแล้ว" });
  });

  test("a stream for someone else's conversation → 404 before any event; no token → 401", async () => {
    const b = await registerUser(ctx.http(), "sse-b");
    const other = await request(ctx.http()).post(`/conversations/${conv}/chat/stream`).set(bearer(b.token)).send({ message: "hi" });
    expect(other.status).toBe(404);
    expect((await request(ctx.http()).post(`/conversations/${conv}/chat/stream`).send({ message: "hi" })).status).toBe(401);
    await ctx.prisma.user.deleteMany({ where: { id: b.id } });
  });

  test("when the client disconnects, the agent stops calling the model", async () => {
    const tasks = ctx.app.get(TasksService);
    const realList = tasks.list.bind(tasks);
    tasks.list = (async (...args: Parameters<typeof realList>) => {
      await new Promise((r) => setTimeout(r, 250)); // tool ช้า เพื่อให้มีเวลาตัดการเชื่อมต่อกลางทาง
      return realList(...args);
    }) as typeof tasks.list;
    const model = ctx.useScript(
      ...[1, 2, 3, 4, 5, 6].map((i) => call(`g${i}`, "getTasks")),
      new AIMessage("จบ"),
    );
    await ctx.app.listen(0);
    const url = await ctx.app.getUrl();
    const abort = new AbortController();
    const res = await fetch(`${url}/conversations/${conv}/chat/stream`, {
      method: "POST",
      headers: { ...bearer(a.token), "content-type": "application/json" },
      body: JSON.stringify({ message: "ดูงานซ้ำๆ" }),
      signal: abort.signal,
    });
    const reader = res.body!.getReader();
    await reader.read(); // event แรก (tool_start)
    abort.abort();
    await reader.cancel().catch(() => undefined);
    const callsAtAbort = model.calls;
    await new Promise((r) => setTimeout(r, 1500)); // ถ้ายังรันต่อ จะวนครบ 7 รอบ
    expect(model.calls).toBeLessThan(7);
    expect(model.calls - callsAtAbort).toBeLessThanOrEqual(1); // รอบที่กำลังทำอยู่ตอนตัดสาย
    tasks.list = realList;
  });
});
