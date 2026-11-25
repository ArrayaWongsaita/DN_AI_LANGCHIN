import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { describe, expect, test } from "vitest";
import { createFakeWeatherApi } from "../src/eval/fake-api.js";
import { assertTrajectory, extractToolCalls } from "../src/eval/trajectory.js";

const ai = (...calls: { name: string; args?: Record<string, unknown> }[]) =>
  new AIMessage({ content: "", tool_calls: calls.map((c, i) => ({ id: `c${i}`, name: c.name, args: c.args ?? {} })) });
const messages = [
  new HumanMessage("x"),
  ai({ name: "getTasks" }),
  new ToolMessage({ content: "[]", tool_call_id: "c0" }),
  ai({ name: "createTask", args: { title: "A" } }, { name: "updateTask", args: { id: "t1" } }),
  new AIMessage("เสร็จ"),
];

describe("extractToolCalls", () => {
  test("flattens tool calls of all AI messages in order", () => {
    expect(extractToolCalls(messages).map((c) => c.name)).toEqual(["getTasks", "createTask", "updateTask"]);
  });
  test("returns [] when there are no tool calls", () => {
    expect(extractToolCalls([new HumanMessage("hi"), new AIMessage("hello")])).toEqual([]);
  });
});

describe("assertTrajectory", () => {
  test("passes for an exact ordered match (args compared as a subset)", () => {
    expect(() =>
      assertTrajectory(messages, [{ name: "getTasks" }, { name: "createTask", args: { title: "A" } }, { name: "updateTask" }]),
    ).not.toThrow();
  });

  test("fails with a message naming the first differing call", () => {
    expect(() => assertTrajectory(messages, [{ name: "getTasks" }, { name: "deleteTask" }])).toThrow(/ลำดับที่ 2.*deleteTask.*createTask/s);
  });

  test("fails when args do not match", () => {
    expect(() => assertTrajectory(messages, [{ name: "getTasks" }, { name: "createTask", args: { title: "B" } }, { name: "updateTask" }])).toThrow(/args/);
  });

  test("fails when there are extra calls (ordered mode is exact)", () => {
    expect(() => assertTrajectory(messages, [{ name: "getTasks" }])).toThrow(/จำนวน/);
  });

  test("unordered mode accepts any order but still requires the same set", () => {
    expect(() => assertTrajectory(messages, [{ name: "updateTask" }, { name: "getTasks" }, { name: "createTask" }], { ordered: false })).not.toThrow();
    expect(() => assertTrajectory(messages, [{ name: "getTasks" }, { name: "getTasks" }, { name: "createTask" }], { ordered: false })).toThrow();
  });
});

describe("createFakeWeatherApi", () => {
  test("fails N times with a 503 error then succeeds, counting calls", async () => {
    const api = createFakeWeatherApi({ failTimes: 2 });
    await expect(api.getWeather("กรุงเทพ")).rejects.toThrow(/503/);
    await expect(api.getWeather("กรุงเทพ")).rejects.toThrow(/503/);
    await expect(api.getWeather("กรุงเทพ")).resolves.toMatchObject({ city: "กรุงเทพ", tempC: expect.any(Number) });
    expect(api.calls).toBe(3);
  });

  test("unknown city rejects with a 404-style error even when not failing", async () => {
    await expect(createFakeWeatherApi().getWeather("เมืองลับ")).rejects.toThrow(/404/);
  });
});
