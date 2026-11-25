import { describe, expect, test } from "vitest";
import { chatReducer, extractSources, initialChatState, type ChatState } from "@/lib/chat-reducer";

const run = (actions: Parameters<typeof chatReducer>[1][], from: ChatState = initialChatState) => actions.reduce(chatReducer, from);

describe("chatReducer", () => {
  test("send adds the user message and an empty assistant message and starts streaming", () => {
    const s = run([{ type: "send", text: "สวัสดี" }]);
    expect(s.streaming).toBe(true);
    expect(s.messages.map((m) => [m.role, m.text])).toEqual([["user", "สวัสดี"], ["assistant", ""]]);
  });

  test("tokens append to the last assistant message", () => {
    const s = run([{ type: "send", text: "x" }, { type: "token", text: "สวัส" }, { type: "token", text: "ดี" }]);
    expect(s.messages.at(-1)!.text).toBe("สวัสดี");
  });

  test("tool indicator appears on tool_start and clears on tool_end", () => {
    const started = run([{ type: "send", text: "x" }, { type: "tool_start", id: "1", name: "getTasks" }]);
    expect(started.tool).toEqual({ id: "1", name: "getTasks" });
    const ended = chatReducer(started, { type: "tool_end", id: "1", name: "getTasks", ok: true, content: "[]" });
    expect(ended.tool).toBeNull();
  });

  test("searchKnowledge results become source references on the answer", () => {
    const content = `<untrusted-data source="mcp:searchKnowledge">\n${JSON.stringify({ results: [{ content: "…", source: "คู่มือ deploy (deploy.md, ส่วนที่ 1)" }] })}\n</untrusted-data>`;
    expect(extractSources(content)).toEqual(["คู่มือ deploy (deploy.md, ส่วนที่ 1)"]);
    expect(extractSources("ไม่พบข้อมูลที่เกี่ยวข้องในเอกสาร")).toEqual([]);
    expect(extractSources("<untrusted-data>not json</untrusted-data>")).toEqual([]);
    const s = run([{ type: "send", text: "x" }, { type: "tool_end", id: "1", name: "searchKnowledge", ok: true, content }, { type: "token", text: "ตอบ" }]);
    expect(s.messages.at(-1)!.sources).toEqual(["คู่มือ deploy (deploy.md, ส่วนที่ 1)"]);
  });

  test("approval_required opens the approval and done ends streaming", () => {
    const s = run([
      { type: "send", text: "ลบ" },
      { type: "approval_required", approvalId: "a1", actions: [{ name: "deleteTask", args: { id: "t1" } }] },
      { type: "done", reply: "" },
    ]);
    expect(s.approval).toEqual({ id: "a1", actions: [{ name: "deleteTask", args: { id: "t1" } }] });
    expect(s.streaming).toBe(false);
  });

  test("approval_resolved closes the dialog and appends the agent's reply", () => {
    const open = run([{ type: "approval_required", approvalId: "a1", actions: [] }]);
    const s = chatReducer(open, { type: "approval_resolved", reply: "ลบแล้ว" });
    expect(s.approval).toBeNull();
    expect(s.messages.at(-1)).toMatchObject({ role: "assistant", text: "ลบแล้ว" });
  });

  test("error stops streaming, clears the tool indicator and shows the message", () => {
    const s = run([{ type: "send", text: "x" }, { type: "tool_start", id: "1", name: "getTasks" }, { type: "error", message: "AI ตอบช้าเกินไป" }]);
    expect(s).toMatchObject({ streaming: false, tool: null, error: "AI ตอบช้าเกินไป" });
  });

  test("stop ends streaming but keeps the partial answer", () => {
    const s = run([{ type: "send", text: "x" }, { type: "token", text: "ครึ่งเดียว" }, { type: "stop" }]);
    expect(s.streaming).toBe(false);
    expect(s.messages.at(-1)!.text).toBe("ครึ่งเดียว");
  });

  test("a new send clears the previous error", () => {
    const s = run([{ type: "error", message: "x" }, { type: "send", text: "ลองใหม่" }]);
    expect(s.error).toBeNull();
  });

  test("load replaces history from the server (human/ai/tool → user/assistant, tool messages hidden)", () => {
    const s = chatReducer(initialChatState, {
      type: "load",
      messages: [
        { role: "human", text: "สวัสดี" },
        { role: "ai", text: "", toolCalls: [{ name: "getTasks", args: {} }] },
        { role: "tool", text: "[]" },
        { role: "ai", text: "ไม่มีงาน" },
      ],
    });
    expect(s.messages.map((m) => [m.role, m.text])).toEqual([["user", "สวัสดี"], ["assistant", "ไม่มีงาน"]]);
  });
});
