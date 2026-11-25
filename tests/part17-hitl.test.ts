import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { Command } from "@langchain/langgraph";
import { createAgent, modelCallLimitMiddleware, modelFallbackMiddleware, modelRetryMiddleware, toolCallLimitMiddleware } from "langchain";
import { z } from "zod";
import { describe, expect, test } from "vitest";
import { TaskStore, createTaskTools, type TaskContext } from "../src/data/tasks.js";
import { createApprovalMiddleware, type ApprovalDecision } from "../src/middleware/approval.js";
import { createAuditMiddleware, type AuditEntry } from "../src/middleware/audit-log.js";
import { createScriptedChatModel } from "../src/utils/scripted-model.js";

const contextSchema = z.object({ userId: z.string(), role: z.enum(["viewer", "editor", "admin"]), name: z.string() });
const ctx: TaskContext = { userId: "u1", role: "admin", name: "สมชาย" };
const call = (name: string, args: Record<string, unknown>, id = "c1") => new AIMessage({ content: "", tool_calls: [{ id, name, args }] });
const user = (content: string) => ({ messages: [{ role: "user" as const, content }] });

function setup(script: AIMessage[], opts: { recheck?: Parameters<typeof createApprovalMiddleware>[0]["recheck"]; extra?: unknown[] } = {}) {
  const store = new TaskStore();
  const audit: AuditEntry[] = [];
  const checkpointer = new MemorySaver();
  const agent = createAgent({
    model: createScriptedChatModel(script),
    tools: createTaskTools(store),
    contextSchema,
    checkpointer,
    middleware: [createAuditMiddleware(audit), ...createApprovalMiddleware({ requireFor: ["deleteTask"], recheck: opts.recheck }), ...((opts.extra ?? []) as never[])] as never[],
  });
  const config = { configurable: { thread_id: "th-1" }, context: ctx };
  const resume = (decision: ApprovalDecision) => agent.invoke(new Command({ resume: { decisions: [decision] } }), config);
  return { agent, store, audit, config, resume };
}

describe("human approval", () => {
  test("a delete call interrupts the run and the task still exists", async () => {
    const { agent, store, config } = setup([call("deleteTask", { id: "t2" }), new AIMessage("ลบแล้ว")]);
    const r = await agent.invoke(user("ลบ t2"), config);
    expect(r.__interrupt__).toBeDefined();
    expect(store.get("u1", "t2")).toBeDefined();
  });

  test("approve deletes exactly once", async () => {
    const { agent, store, audit, config, resume } = setup([call("deleteTask", { id: "t2" }), new AIMessage("ลบแล้ว")]);
    await agent.invoke(user("ลบ t2"), config);
    await resume({ type: "approve" });
    expect(store.get("u1", "t2")).toBeUndefined();
    expect(audit.filter((e) => e.tool === "deleteTask" && e.ok)).toHaveLength(1);
  });

  test("reject leaves the task and tells the model", async () => {
    const { agent, store, config, resume } = setup([call("deleteTask", { id: "t2" }), new AIMessage("ยกเลิกการลบ")]);
    await agent.invoke(user("ลบ t2"), config);
    const r = await resume({ type: "reject", message: "ผู้ใช้ไม่อนุมัติ" });
    expect(store.get("u1", "t2")).toBeDefined();
    const toolMsg = r.messages.find((m) => ToolMessage.isInstance(m)) as ToolMessage;
    expect(String(toolMsg.content)).toContain("ผู้ใช้ไม่อนุมัติ");
  });

  test("edit changes the args: the edited call runs, the original does not", async () => {
    const { agent, store, config, resume } = setup([call("deleteTask", { id: "t2" }), new AIMessage("ลบ t1 แล้ว")]);
    await agent.invoke(user("ลบ t2"), config);
    await resume({ type: "edit", editedAction: { name: "deleteTask", args: { id: "t1" } } });
    expect(store.get("u1", "t1")).toBeUndefined();
    expect(store.get("u1", "t2")).toBeDefined();
  });

  test("resuming twice does not delete twice", async () => {
    const { agent, audit, config, resume } = setup([call("deleteTask", { id: "t2" }), new AIMessage("ลบแล้ว"), new AIMessage("เกินสคริปต์")]);
    await agent.invoke(user("ลบ t2"), config);
    await resume({ type: "approve" });
    await resume({ type: "approve" }).catch(() => undefined); // รอบสองจะ error หรือไม่ทำอะไรก็ได้ แต่ห้ามลบซ้ำ
    expect(audit.filter((e) => e.tool === "deleteTask" && e.ok)).toHaveLength(1);
  });

  test("approval granted but the user lost permission → recheck blocks the delete", async () => {
    let allowed = true;
    const { agent, store, config, resume } = setup([call("deleteTask", { id: "t2" }), new AIMessage("ลบไม่ได้")], {
      recheck: () => allowed,
    });
    await agent.invoke(user("ลบ t2"), config);
    allowed = false; // สิทธิ์ถูกถอนระหว่างรออนุมัติ
    const r = await resume({ type: "approve" });
    expect(store.get("u1", "t2")).toBeDefined();
    const toolMsg = r.messages.find((m) => ToolMessage.isInstance(m)) as ToolMessage;
    expect(toolMsg.status).toBe("error");
  });
});

describe("reliability middleware", () => {
  test("tool call limit stops a runaway script with a readable message", async () => {
    const script = [call("getTasks", {}, "a"), call("getTasks", {}, "b"), call("getTasks", {}, "c"), new AIMessage("จบ")];
    const { agent, config } = setup(script, { extra: [toolCallLimitMiddleware({ runLimit: 2, exitBehavior: "continue" })] });
    const r = await agent.invoke(user("ดูงาน"), { ...config, configurable: { thread_id: "th-limit" } });
    const errors = r.messages.filter((m) => ToolMessage.isInstance(m) && m.status === "error");
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(String(errors[0].content)).toMatch(/limit/i);
  });

  test("model call limit ends the run", async () => {
    const script = [call("getTasks", {}, "a"), call("getTasks", {}, "b"), call("getTasks", {}, "c"), new AIMessage("จบ")];
    const { agent, config } = setup(script, { extra: [modelCallLimitMiddleware({ runLimit: 2, exitBehavior: "end" })] });
    const r = await agent.invoke(user("ดูงาน"), { ...config, configurable: { thread_id: "th-mlimit" } });
    expect(String(r.messages.at(-1)!.content)).toMatch(/limit/i);
  });

  test("primary model throws → fallback model answers", async () => {
    const primary = createScriptedChatModel([]); // สคริปต์ว่าง = throw ทุกครั้ง
    const fallback = createScriptedChatModel([new AIMessage("ตอบจาก fallback")]);
    const agent = createAgent({
      model: primary,
      tools: createTaskTools(new TaskStore()),
      contextSchema,
      middleware: [modelFallbackMiddleware(fallback)],
    });
    const r = await agent.invoke(user("สวัสดี"), { context: ctx });
    expect(String(r.messages.at(-1)!.content)).toBe("ตอบจาก fallback");
    expect(fallback.calls).toBe(1);
  });

  test("model retry retries a transient failure then succeeds", async () => {
    let n = 0;
    const flaky = createScriptedChatModel([new AIMessage("ok")]);
    const original = flaky._generate.bind(flaky);
    flaky._generate = async (...args: Parameters<typeof original>) => {
      if (n++ < 2) throw new Error("503 temporarily unavailable");
      return original(...args);
    };
    const agent = createAgent({
      model: flaky,
      tools: createTaskTools(new TaskStore()),
      contextSchema,
      middleware: [modelRetryMiddleware({ maxRetries: 3, initialDelayMs: 1, jitter: false })],
    });
    const r = await agent.invoke(user("สวัสดี"), { context: ctx });
    expect(String(r.messages.at(-1)!.content)).toBe("ok");
    expect(n).toBe(3);
  });
});

describe("flaky model helper", () => {
  test("fails the first N calls with the given message, then delegates (also after bindTools)", async () => {
    const { createFlakyModel } = await import("../src/utils/flaky-model.js");
    const flaky = createFlakyModel(createScriptedChatModel([new AIMessage("ok")]), 2, "503 down");
    const bound = flaky.bindTools!([]) as typeof flaky;
    await expect(bound.invoke("x")).rejects.toThrow(/503 down.*1/);
    await expect(bound.invoke("x")).rejects.toThrow(/2/);
    expect(String((await bound.invoke("x")).content)).toBe("ok");
    expect(flaky.callCount).toBe(3);
  });
});
