import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { afterEach, describe, expect, test } from "vitest";
import { createFakeEmbeddings } from "../src/embeddings/fake.js";
import { cosineSimilarity, dotProduct, euclideanDistance } from "../src/utils/similarity.js";
import { createScriptedChatModel } from "../src/utils/scripted-model.js";
import { createPool, withDb } from "../src/utils/db.js";

describe("similarity", () => {
  test("cosine of identical, orthogonal and opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });
  test("dot product and euclidean distance", () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
  });
  test("length mismatch throws", () => {
    expect(() => cosineSimilarity([1], [1, 2])).toThrow(/length/i);
    expect(() => dotProduct([1], [1, 2])).toThrow(/length/i);
    expect(() => euclideanDistance([1], [1, 2])).toThrow(/length/i);
  });
  test("zero vector yields 0 instead of NaN", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe("createFakeEmbeddings", () => {
  const emb = createFakeEmbeddings();
  test("same text gives same vector, different text differs", async () => {
    const [a, b] = await emb.embedDocuments(["สวัสดี", "hello"]);
    expect(await emb.embedQuery("สวัสดี")).toEqual(a);
    expect(a).not.toEqual(b);
  });
  test("768 dims, unit norm, order preserved", async () => {
    const [a, b] = await emb.embedDocuments(["a", "b"]);
    expect(a).toHaveLength(768);
    expect(Math.sqrt(dotProduct(a, a))).toBeCloseTo(1);
    expect(b).toEqual(await emb.embedQuery("b"));
  });
  test("custom dimension and empty input", async () => {
    expect(await createFakeEmbeddings(8).embedQuery("x")).toHaveLength(8);
    expect(await emb.embedDocuments([])).toEqual([]);
  });
});

describe("createScriptedChatModel", () => {
  const call = new AIMessage({ content: "", tool_calls: [{ name: "add", args: { a: 1, b: 2 }, id: "c1" }] });
  const final = new AIMessage("เสร็จแล้ว");
  test("returns scripted messages in order then throws when exhausted", async () => {
    const m = createScriptedChatModel([call, final]);
    expect((await m.invoke("x")).tool_calls?.[0].name).toBe("add");
    expect((await m.invoke("y")).content).toBe("เสร็จแล้ว");
    await expect(m.invoke("z")).rejects.toThrow(/script/i);
    expect(m.calls).toBe(3);
    expect(m.seenMessages[0][0]).toBeInstanceOf(HumanMessage);
  });
  test("bindTools keeps behaviour", async () => {
    const m = createScriptedChatModel([final]);
    const bound = m.bindTools!([]);
    expect((await bound.invoke("x")).content).toBe("เสร็จแล้ว");
  });
});

describe("db", () => {
  const saved = process.env.DATABASE_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = saved;
  });
  test("createPool without DATABASE_URL names the variable", () => {
    delete process.env.DATABASE_URL;
    expect(() => createPool()).toThrow(/DATABASE_URL/);
  });
  test("withDb on unreachable server explains docker compose", async () => {
    process.env.DATABASE_URL = "postgres://x:y@127.0.0.1:1/db";
    await expect(withDb(async (p) => p.query("select 1"))).rejects.toThrow(/docker compose up -d/);
  });
});
