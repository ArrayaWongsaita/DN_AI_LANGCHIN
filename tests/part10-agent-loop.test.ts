import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { describe, expect, test } from "vitest";
import { runAgentLoop, type LoopEvent } from "../src/agents/agent-loop.js";
import { workshopTools } from "../src/tools/index.js";
import { createScriptedChatModel } from "../src/utils/scripted-model.js";

const call = (name: string, args: Record<string, unknown>, id: string) => ({ name, args, id, type: "tool_call" as const });
const aiCalls = (...calls: ReturnType<typeof call>[]) => new AIMessage({ content: "", tool_calls: calls });
const ask = (text: string) => [new HumanMessage(text)];

describe("runAgentLoop", () => {
  test("single tool call then final answer", async () => {
    const model = createScriptedChatModel([aiCalls(call("add", { a: 1, b: 2 }, "c1")), new AIMessage("ได้ 3")]);
    const r = await runAgentLoop({ model, tools: workshopTools, messages: ask("1+2") });
    expect(r.stopReason).toBe("final");
    expect(r.iterations).toBe(2);
    expect(r.finalText).toBe("ได้ 3");
    expect(r.messages.map((m) => m.getType())).toEqual(["human", "ai", "tool", "ai"]);
  });

  test("two dependent steps", async () => {
    const model = createScriptedChatModel([
      aiCalls(call("add", { a: 15, b: 27 }, "c1")),
      aiCalls(call("multiply", { a: 42, b: 3 }, "c2")),
      new AIMessage("126"),
    ]);
    const r = await runAgentLoop({ model, tools: workshopTools, messages: ask("x") });
    expect(r.iterations).toBe(3);
    expect(r.messages.filter((m) => m.getType() === "tool").map((m) => m.content)).toEqual(["42", "126"]);
  });

  test("parallel calls get one ToolMessage each, ids matched, before the next model call", async () => {
    const model = createScriptedChatModel([
      aiCalls(call("add", { a: 1, b: 1 }, "p1"), call("multiply", { a: 2, b: 3 }, "p2")),
      new AIMessage("เสร็จ"),
    ]);
    await runAgentLoop({ model, tools: workshopTools, messages: ask("x") });
    const second = model.seenMessages[1];
    const tail = second.slice(-2) as ToolMessage[];
    expect(tail.map((m) => m.tool_call_id)).toEqual(["p1", "p2"]);
    expect(tail.map((m) => m.content)).toEqual(["2", "6"]);
  });

  test("unknown tool becomes an error ToolMessage and the loop continues", async () => {
    const model = createScriptedChatModel([aiCalls(call("teleport", {}, "c1")), new AIMessage("ขออภัย ทำไม่ได้")]);
    const r = await runAgentLoop({ model, tools: workshopTools, messages: ask("x") });
    expect(r.stopReason).toBe("final");
    const tool = r.messages.find((m) => m.getType() === "tool") as ToolMessage;
    expect(tool.status).toBe("error");
  });

  test("stops at maxIterations when the model never stops asking for tools", async () => {
    const script = Array.from({ length: 6 }, (_, i) => aiCalls(call("add", { a: i, b: 1 }, `c${i}`)));
    const model = createScriptedChatModel(script);
    const r = await runAgentLoop({ model, tools: workshopTools, messages: ask("x"), maxIterations: 3 });
    expect(r.stopReason).toBe("max_iterations");
    expect(model.calls).toBe(3);
    expect(r.iterations).toBe(3);
  });

  test("an already-aborted signal stops before calling the model", async () => {
    const model = createScriptedChatModel([new AIMessage("never")]);
    const ctrl = new AbortController();
    ctrl.abort();
    const r = await runAgentLoop({ model, tools: workshopTools, messages: ask("x"), signal: ctrl.signal });
    expect(r.stopReason).toBe("aborted");
    expect(model.calls).toBe(0);
  });

  test("abort between iterations stops the loop", async () => {
    const ctrl = new AbortController();
    const model = createScriptedChatModel([aiCalls(call("add", { a: 1, b: 1 }, "c1")), new AIMessage("never reached")]);
    const r = await runAgentLoop({
      model, tools: workshopTools, messages: ask("x"), signal: ctrl.signal,
      onStep: (e) => { if (e.type === "tool") ctrl.abort(); },
    });
    expect(r.stopReason).toBe("aborted");
    expect(model.calls).toBe(1);
  });

  test("onStep sees every model and tool message; input messages are not mutated", async () => {
    const model = createScriptedChatModel([aiCalls(call("add", { a: 1, b: 2 }, "c1")), new AIMessage("ok")]);
    const input = ask("x");
    const events: LoopEvent[] = [];
    await runAgentLoop({ model, tools: workshopTools, messages: input, onStep: (e) => events.push(e) });
    expect(events.map((e) => e.type)).toEqual(["model", "tool", "model"]);
    expect(input).toHaveLength(1);
  });

  test("model error propagates (not swallowed)", async () => {
    const model = createScriptedChatModel([]);
    await expect(runAgentLoop({ model, tools: workshopTools, messages: ask("x") })).rejects.toThrow(/script/i);
  });
});
