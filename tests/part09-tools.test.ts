import { AIMessage } from "@langchain/core/messages";
import { describe, expect, test } from "vitest";
import { executeToolCalls } from "../src/agents/execute-tools.js";
import { add, getCurrentDate, getWeather, multiply, searchProduct, subtract, workshopTools } from "../src/tools/index.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

describe("workshop tools", () => {
  test("arithmetic", async () => {
    expect(await add.invoke({ a: 2, b: 3 })).toBe("5");
    expect(await subtract.invoke({ a: 2, b: 3 })).toBe("-1");
    expect(await multiply.invoke({ a: 4, b: 2.5 })).toBe("10");
  });

  test("schema rejects wrong types", async () => {
    await expect(add.invoke({ a: "x", b: 1 } as never)).rejects.toThrow();
    await expect(searchProduct.invoke({ query: "" })).rejects.toThrow();
  });

  test("getWeather known and unknown city", async () => {
    expect(await getWeather.invoke({ city: "เชียงใหม่" })).toContain("เชียงใหม่");
    expect(await getWeather.invoke({ city: "Atlantis" })).toContain("ไม่พบข้อมูลเมือง");
  });

  test("searchProduct is case-insensitive and reports no match", async () => {
    expect(await searchProduct.invoke({ query: "KEYBOARD" })).toContain("Mechanical Keyboard");
    expect(await searchProduct.invoke({ query: "zzzz" })).toContain("ไม่พบสินค้า");
  });

  test("getCurrentDate returns an ISO date", async () => {
    expect(await getCurrentDate.invoke({})).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("workshopTools lists all six by name", () => {
    expect(workshopTools.map((t) => t.name).sort()).toEqual(
      ["add", "getCurrentDate", "getWeather", "multiply", "searchProduct", "subtract"],
    );
  });
});

describe("executeToolCalls", () => {
  const call = (name: string, args: Record<string, unknown>, id: string) => ({ name, args, id, type: "tool_call" as const });

  test("returns one ToolMessage per call, in order, with matching ids; unknown tool is an error", async () => {
    const ai = new AIMessage({ content: "", tool_calls: [call("add", { a: 1, b: 2 }, "c1"), call("nope", {}, "c2")] });
    const out = await executeToolCalls(workshopTools, ai);
    expect(out.map((m) => m.tool_call_id)).toEqual(["c1", "c2"]);
    expect(out[0].content).toBe("3");
    expect(out[0].status).toBe("success");
    expect(out[1].status).toBe("error");
    expect(String(out[1].content)).toMatch(/^Error:/);
  });

  test("invalid args become an error ToolMessage", async () => {
    const ai = new AIMessage({ content: "", tool_calls: [call("add", { a: "x", b: 1 }, "c1")] });
    const [m] = await executeToolCalls(workshopTools, ai);
    expect(m.status).toBe("error");
    expect(String(m.content)).toMatch(/^Error:/);
  });

  test("a tool that throws becomes an error ToolMessage", async () => {
    const boom = tool(async () => { throw new Error("พัง"); }, { name: "boom", description: "x", schema: z.object({}) });
    const ai = new AIMessage({ content: "", tool_calls: [call("boom", {}, "c9")] });
    const [m] = await executeToolCalls([boom], ai);
    expect(m.status).toBe("error");
    expect(String(m.content)).toContain("พัง");
    expect(m.tool_call_id).toBe("c9");
  });

  test("no tool calls gives an empty array", async () => {
    expect(await executeToolCalls(workshopTools, new AIMessage("hi"))).toEqual([]);
  });
});
