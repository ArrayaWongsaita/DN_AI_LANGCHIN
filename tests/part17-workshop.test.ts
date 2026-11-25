import { AIMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { describe, expect, test } from "vitest";
import { TaskStore, type TaskContext } from "../src/data/tasks.js";
import type { AuditEntry } from "../src/middleware/audit-log.js";
import { createScriptedChatModel } from "../src/utils/scripted-model.js";
import { createTaskAgent, runTurn } from "../workshops/part-17/solution/task-agent.js";

const call = (name: string, args: Record<string, unknown>, id = "c1") => new AIMessage({ content: "", tool_calls: [{ id, name, args }] });
const ctx = (role: TaskContext["role"]): TaskContext => ({ userId: "u1", role, name: "สมชาย" });

function make(script: AIMessage[], role: TaskContext["role"]) {
  const store = new TaskStore();
  const audit: AuditEntry[] = [];
  const agent = createTaskAgent({ model: createScriptedChatModel(script), store, audit, checkpointer: new MemorySaver() });
  return { agent, store, audit, context: ctx(role) };
}

describe("workshop 17 task agent", () => {
  test("viewer cannot create a task (refused, nothing added, attempt audited as failed)", async () => {
    const { agent, store, audit, context } = make([call("createTask", { title: "แอบเพิ่ม" }), new AIMessage("ไม่มีสิทธิ์")], "viewer");
    await runTurn(agent, { context, threadId: "t-viewer", message: "เพิ่มงาน" });
    expect(store.list("u1").map((t) => t.title)).not.toContain("แอบเพิ่ม");
    expect(audit).toEqual([expect.objectContaining({ tool: "createTask", ok: false, userId: "u1" })]);
  });

  test("editor creates a task", async () => {
    const { agent, store, context } = make([call("createTask", { title: "งานใหม่" }), new AIMessage("เพิ่มแล้ว")], "editor");
    const r = await runTurn(agent, { context, threadId: "t-editor", message: "เพิ่มงาน" });
    expect(r.interrupted).toBe(false);
    expect(store.list("u1").map((t) => t.title)).toContain("งานใหม่");
  });

  test("admin delete pauses until a decision; approve deletes once and audit shows create + denied + approved delete", async () => {
    const { agent, store, audit, context } = make(
      [call("deleteTask", { id: "t2" }), new AIMessage("ลบแล้ว")],
      "admin",
    );
    const paused = await runTurn(agent, { context, threadId: "t-admin", message: "ลบ t2" });
    expect(paused.interrupted).toBe(true);
    expect(paused.request?.[0]).toMatchObject({ name: "deleteTask", args: { id: "t2" } });
    expect(store.get("u1", "t2")).toBeDefined();
    const done = await runTurn(agent, { context, threadId: "t-admin", decision: { type: "approve" } });
    expect(done.interrupted).toBe(false);
    expect(store.get("u1", "t2")).toBeUndefined();
    expect(audit.filter((e) => e.tool === "deleteTask" && e.ok)).toHaveLength(1);
  });

  test("a runaway script is stopped by the tool-call limit (6)", async () => {
    const script = Array.from({ length: 9 }, (_, i) => call("getTasks", {}, `g${i}`));
    const { agent, context } = make([...script, new AIMessage("จบ")], "viewer");
    const r = await runTurn(agent, { context, threadId: "t-limit", message: "วนไปเรื่อยๆ" });
    expect(r.reply).toMatch(/limit/i);
  });
});
