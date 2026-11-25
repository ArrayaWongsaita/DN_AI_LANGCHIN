import { messageText } from "../src/utils/text.js";
import { AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware } from "langchain";
import { z } from "zod";
import { describe, expect, test } from "vitest";
import { TaskStore, createTaskTools, type TaskContext } from "../src/data/tasks.js";
import { createAuditMiddleware, type AuditEntry } from "../src/middleware/audit-log.js";
import { createDynamicPromptMiddleware } from "../src/middleware/dynamic-prompt.js";
import { createLoggingMiddleware, type LogEvent } from "../src/middleware/logging.js";
import { createRoleBasedToolMiddleware } from "../src/middleware/role-tools.js";
import { createToolErrorMiddleware } from "../src/middleware/tool-errors.js";
import { createScriptedChatModel } from "../src/utils/scripted-model.js";

const contextSchema = z.object({ userId: z.string(), role: z.enum(["viewer", "editor", "admin"]), name: z.string() });
const ctx = (role: TaskContext["role"], userId = "u1"): TaskContext => ({ userId, role, name: "สมชาย" });
const call = (name: string, args: Record<string, unknown>, id = "c1") => new AIMessage({ content: "", tool_calls: [{ id, name, args }] });
const ask = (text = "ทำให้หน่อย") => ({ messages: [{ role: "user" as const, content: text }] });

function build(script: AIMessage[], middleware: unknown[], store = new TaskStore()) {
  const model = createScriptedChatModel(script);
  const agent = createAgent({ model, tools: createTaskTools(store), contextSchema, middleware: middleware as never[] });
  return { agent, model, store };
}

describe("logging middleware", () => {
  test("emits before_model, after_model and tool events in order", async () => {
    const events: LogEvent[] = [];
    const { agent } = build([call("getTasks", {}), new AIMessage("มี 3 งาน")], [createLoggingMiddleware((e) => events.push(e))]);
    await agent.invoke(ask(), { context: ctx("viewer") });
    expect(events.map((e) => `${e.phase}:${e.name}`)).toEqual([
      "before_model:model",
      "after_model:model",
      "tool:getTasks",
      "before_model:model",
      "after_model:model",
    ]);
    expect(events.find((e) => e.phase === "tool")?.ms).toBeGreaterThanOrEqual(0);
  });
});

describe("tool error middleware", () => {
  test("a throwing wrapToolCall becomes an error ToolMessage and the agent finishes", async () => {
    const boom = createMiddleware({
      name: "boom",
      wrapToolCall: async () => {
        throw new Error("db down");
      },
    });
    const { agent } = build([call("getTasks", {}), new AIMessage("ขออภัย ดึงข้อมูลไม่ได้")], [createToolErrorMiddleware(), boom]);
    const r = await agent.invoke(ask(), { context: ctx("viewer") });
    const toolMsg = r.messages.find((m) => ToolMessage.isInstance(m)) as ToolMessage;
    expect(toolMsg.status).toBe("error");
    expect(String(toolMsg.content)).toMatch(/db down/);
    expect(toolMsg.tool_call_id).toBe("c1");
    expect(String(r.messages.at(-1)!.content)).toContain("ขออภัย");
  });
});

describe("audit middleware", () => {
  test("records userId from context (not from model args), tool, args and result", async () => {
    const log: AuditEntry[] = [];
    const { agent } = build(
      [call("createTask", { title: "งานใหม่", userId: "u2" }), new AIMessage("ok")],
      [createAuditMiddleware(log)],
    );
    await agent.invoke(ask(), { context: ctx("editor") });
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ userId: "u1", tool: "createTask", ok: true });
    expect(log[0].args).toMatchObject({ title: "งานใหม่" });
  });
});

describe("role-based tool middleware", () => {
  test("viewer does not see write/destructive tools; admin sees all", async () => {
    const seen: Record<string, string[]> = {};
    const spy = (label: string) =>
      createMiddleware({
        name: `spy-${label}`,
        wrapModelCall: (req, handler) => {
          seen[label] = req.tools.map((t) => (t as { name: string }).name);
          return handler(req);
        },
      });
    for (const role of ["viewer", "editor", "admin"] as const) {
      const { agent } = build([new AIMessage("ok")], [createRoleBasedToolMiddleware(), spy(role)]);
      await agent.invoke(ask(), { context: ctx(role) });
    }
    expect(seen.viewer).toEqual(["getTasks"]);
    expect(seen.editor).toEqual(["getTasks", "createTask", "updateTask"]);
    expect(seen.admin).toEqual(["getTasks", "createTask", "updateTask", "deleteTask"]);
  });

  test("a hallucinated call to a forbidden tool is refused at execution and nothing changes", async () => {
    const { agent, store } = build([call("deleteTask", { id: "t1" }), new AIMessage("ทำไม่ได้")], [createRoleBasedToolMiddleware()]);
    const r = await agent.invoke(ask(), { context: ctx("viewer") });
    const toolMsg = r.messages.find((m) => ToolMessage.isInstance(m)) as ToolMessage;
    expect(toolMsg.status).toBe("error");
    expect(store.get("u1", "t1")).toBeDefined();
  });
});

describe("dynamic prompt middleware", () => {
  test("system prompt contains the runtime-context name and role", async () => {
    const { agent, model } = build([new AIMessage("ok")], [createDynamicPromptMiddleware("คุณคือผู้ช่วยจัดการงาน")]);
    await agent.invoke(ask(), { context: ctx("editor") });
    const sys = model.seenMessages[0].find((m) => SystemMessage.isInstance(m))!;
    expect(messageText(sys)).toContain("คุณคือผู้ช่วยจัดการงาน");
    expect(messageText(sys)).toContain("สมชาย");
    expect(messageText(sys)).toContain("editor");
  });
});

describe("middleware semantics", () => {
  test("middlewares run in declared order (beforeModel A then B)", async () => {
    const order: string[] = [];
    const mk = (n: string) => createMiddleware({ name: n, beforeModel: () => void order.push(n) });
    const { agent } = build([new AIMessage("ok")], [mk("A"), mk("B")]);
    await agent.invoke(ask(), { context: ctx("viewer") });
    expect(order).toEqual(["A", "B"]);
  });

  test("a beforeModel that returns undefined is a no-op", async () => {
    const noop = createMiddleware({ name: "noop", beforeModel: () => undefined });
    const { agent } = build([new AIMessage("ok")], [noop]);
    const r = await agent.invoke(ask(), { context: ctx("viewer") });
    expect(String(r.messages.at(-1)!.content)).toBe("ok");
  });
});
