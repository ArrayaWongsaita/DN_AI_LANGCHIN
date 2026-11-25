import { Embeddings } from "@langchain/core/embeddings";
import { describe, expect, test } from "vitest";
import { createFakeEmbeddings } from "../src/embeddings/fake.js";
import { semanticProducts } from "../src/data/semantic-products.js";
import { semanticSearch } from "../src/rag/semantic-search.js";

/** Embeddings จิ๋วที่รู้เวกเตอร์ 2 มิติแน่นอน: "x:<a>,<b>" → [a, b] */
class StubEmbeddings extends Embeddings {
  embedCalls = { query: 0, documents: 0 };
  constructor(private readonly table: Record<string, number[]>) {
    super({});
  }
  private vec(t: string): number[] {
    const v = this.table[t];
    if (!v) throw new Error(`no vector for "${t}"`);
    return v;
  }
  async embedQuery(t: string) {
    this.embedCalls.query++;
    return this.vec(t);
  }
  async embedDocuments(ts: string[]) {
    this.embedCalls.documents++;
    return ts.map((t) => this.vec(t));
  }
}

const stub = () =>
  new StubEmbeddings({
    q: [1, 0],
    near: [0.9, 0.1],
    mid: [0.5, 0.5],
    far: [0, 1],
    opposite: [-1, 0],
  });
const docs = [
  { id: "far", text: "far" },
  { id: "near", text: "near" },
  { id: "mid", text: "mid" },
  { id: "opposite", text: "opposite" },
];

describe("semanticSearch (stub 2-D embeddings)", () => {
  test("orders by cosine similarity descending and limits by topK (default 3)", async () => {
    const r = await semanticSearch({ query: "q", documents: docs, embeddings: stub() });
    expect(r.map((x) => x.id)).toEqual(["near", "mid", "far"]);
    expect(r[0].score).toBeGreaterThan(r[1].score);
    expect((await semanticSearch({ query: "q", documents: docs, embeddings: stub(), topK: 1 })).map((x) => x.id)).toEqual(["near"]);
  });
  test("minScore filters low-similarity results", async () => {
    const r = await semanticSearch({ query: "q", documents: docs, embeddings: stub(), topK: 10, minScore: 0.5 });
    expect(r.map((x) => x.id)).toEqual(["near", "mid"]);
  });
  test("a document identical to the query scores ≈ 1 and ranks first", async () => {
    const r = await semanticSearch({ query: "q", documents: [{ id: "same", text: "q" }, ...docs], embeddings: stub() });
    expect(r[0].id).toBe("same");
    expect(r[0].score).toBeCloseTo(1, 5);
  });
  test("embeds the documents once (batch) and the query once", async () => {
    const e = stub();
    await semanticSearch({ query: "q", documents: docs, embeddings: e });
    expect(e.embedCalls).toEqual({ query: 1, documents: 1 });
  });
  test("empty documents and blank query give [] without calling the embedding model", async () => {
    const e = stub();
    expect(await semanticSearch({ query: "q", documents: [], embeddings: e })).toEqual([]);
    expect(await semanticSearch({ query: "   ", documents: docs, embeddings: e })).toEqual([]);
    expect(e.embedCalls).toEqual({ query: 0, documents: 0 });
  });
  test("topK <= 0 throws", async () => {
    await expect(semanticSearch({ query: "q", documents: docs, embeddings: stub(), topK: 0 })).rejects.toThrow();
    await expect(semanticSearch({ query: "q", documents: docs, embeddings: stub(), topK: -1 })).rejects.toThrow();
  });
  test("negative similarity is returned with a negative score only if minScore allows it", async () => {
    const r = await semanticSearch({ query: "q", documents: docs, embeddings: stub(), topK: 10, minScore: -1 });
    expect(r.at(-1)).toMatchObject({ id: "opposite" });
    expect(r.at(-1)!.score).toBeCloseTo(-1, 5);
  });
});

describe("semanticSearch: query vs document embeddings and bad provider output", () => {
  test("uses queryEmbeddings for the query and embeddings for the documents", async () => {
    const docsOnly = stub();
    const queryOnly = stub();
    await semanticSearch({ query: "q", documents: docs, embeddings: docsOnly, queryEmbeddings: queryOnly });
    expect(docsOnly.embedCalls).toEqual({ query: 0, documents: 1 });
    expect(queryOnly.embedCalls).toEqual({ query: 1, documents: 0 });
  });
  test("an empty query vector (provider hiccup) throws a clear error instead of a cryptic mismatch", async () => {
    const bad = new StubEmbeddings({ q: [], near: [1, 0] });
    await expect(semanticSearch({ query: "q", documents: [{ id: "near", text: "near" }], embeddings: bad })).rejects.toThrow(/embedding/i);
  });
  test("a wrong number of document vectors throws a clear error", async () => {
    class Short extends StubEmbeddings {
      override async embedDocuments() {
        return [[1, 0]];
      }
    }
    const e = new Short({ q: [1, 0], near: [1, 0], mid: [1, 0] });
    await expect(
      semanticSearch({ query: "q", documents: [{ id: "a", text: "near" }, { id: "b", text: "mid" }], embeddings: e }),
    ).rejects.toThrow(/embedding/i);
  });
});

describe("semanticSearch with fake (hash) embeddings", () => {
  test("identical text is found first, deterministically", async () => {
    const e = createFakeEmbeddings();
    const documents = semanticProducts.map((p) => ({ id: p.id, text: p.text }));
    const target = documents[4];
    const r = await semanticSearch({ query: target.text, documents, embeddings: e, topK: 2 });
    expect(r[0].id).toBe(target.id);
    expect(r[0].score).toBeCloseTo(1, 5);
  });
});

describe("semanticProducts data", () => {
  test("has ≥ 12 products with unique ids, including the tech trio and unrelated items", () => {
    expect(semanticProducts.length).toBeGreaterThanOrEqual(12);
    expect(new Set(semanticProducts.map((p) => p.id)).size).toBe(semanticProducts.length);
    const names = semanticProducts.map((p) => p.name).join("|");
    for (const n of ["Laptop", "Mechanical Keyboard", "Monitor"]) expect(names).toContain(n);
    expect(semanticProducts.some((p) => p.category !== "electronics")).toBe(true);
  });
});
