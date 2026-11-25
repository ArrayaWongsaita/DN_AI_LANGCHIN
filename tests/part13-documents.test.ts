import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Document } from "@langchain/core/documents";
import { describe, expect, test } from "vitest";
import { chunkDocuments, loadCurriculum } from "../src/rag/load-curriculum.js";

describe("loadCurriculum (real sample folder)", () => {
  test("loads every supported type with source and type metadata", async () => {
    const { documents, warnings } = await loadCurriculum();
    expect(documents.length).toBeGreaterThanOrEqual(6);
    for (const d of documents) {
      expect(typeof d.metadata.source).toBe("string");
      expect(d.metadata.source).not.toMatch(/^\//); // relative path
      expect(["txt", "md", "json", "csv", "pdf"]).toContain(d.metadata.type);
      expect(d.pageContent.trim().length).toBeGreaterThan(0);
    }
    const types = new Set(documents.map((d) => d.metadata.type));
    expect(types).toEqual(new Set(["txt", "md", "json", "csv", "pdf"]));
    expect(warnings).toEqual([]);
  });
  test("pdf text is extracted", async () => {
    const { documents } = await loadCurriculum();
    expect(documents.filter((d) => d.metadata.type === "pdf").map((d) => d.pageContent).join(" ")).toContain("Attendance");
  });
});

describe("loadCurriculum (edge cases)", () => {
  test("empty file, unsupported extension and missing dir give warnings, not exceptions", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cur-"));
    writeFileSync(join(dir, "empty.txt"), "   \n");
    writeFileSync(join(dir, "image.png"), "x");
    writeFileSync(join(dir, "ok.md"), "# เนื้อหา\nข้อความทดสอบ");
    writeFileSync(join(dir, "bad.json"), "{not json");
    const { documents, warnings } = await loadCurriculum(dir);
    expect(documents.map((d) => d.metadata.source)).toEqual(["ok.md"]);
    expect(warnings.some((w) => w.includes("empty.txt"))).toBe(true);
    expect(warnings.some((w) => w.includes("image.png"))).toBe(true);
    expect(warnings.some((w) => w.includes("bad.json"))).toBe(true);
    const missing = await loadCurriculum(join(dir, "nope"));
    expect(missing.documents).toEqual([]);
    expect(missing.warnings.length).toBe(1);
  });
});

describe("chunkDocuments", () => {
  const long = (n: number) => Array.from({ length: n }, (_, i) => `ประโยคที่ ${i + 1} ของเอกสารทดสอบ`).join(" ");
  test("keeps source on every chunk and numbers chunkIndex per source", async () => {
    const docs = [
      new Document({ pageContent: long(60), metadata: { source: "a.txt", type: "txt" } }),
      new Document({ pageContent: long(60), metadata: { source: "b.txt", type: "txt" } }),
    ];
    const chunks = await chunkDocuments(docs, { chunkSize: 200, chunkOverlap: 20 });
    for (const src of ["a.txt", "b.txt"]) {
      const mine = chunks.filter((c) => c.metadata.source === src);
      expect(mine.length).toBeGreaterThan(1);
      expect(mine.map((c) => c.metadata.chunkIndex)).toEqual(mine.map((_, i) => i));
    }
    expect(chunks.every((c) => c.pageContent.length <= 200)).toBe(true);
    expect(chunks.every((c) => c.metadata.type === "txt")).toBe(true);
  });
  test("consecutive chunks overlap", async () => {
    const doc = new Document({ pageContent: long(40), metadata: { source: "a.txt" } });
    const chunks = await chunkDocuments([doc], { chunkSize: 200, chunkOverlap: 50 });
    const tail = chunks[0].pageContent.slice(-20);
    expect(chunks[1].pageContent).toContain(tail.trim().split(" ").slice(-2).join(" "));
  });
  test("empty input gives []", async () => {
    expect(await chunkDocuments([])).toEqual([]);
  });
  test("chunkOverlap >= chunkSize throws", async () => {
    await expect(chunkDocuments([], { chunkSize: 100, chunkOverlap: 100 })).rejects.toThrow();
    await expect(chunkDocuments([], { chunkSize: 100, chunkOverlap: 150 })).rejects.toThrow();
  });
  test("Thai text without spaces is still split by size", async () => {
    const thai = "ก".repeat(1000);
    const chunks = await chunkDocuments([new Document({ pageContent: thai, metadata: { source: "t.txt" } })], { chunkSize: 300, chunkOverlap: 30 });
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.every((c) => c.pageContent.length <= 300)).toBe(true);
  });
  test("does not mutate the input documents' metadata", async () => {
    const doc = new Document({ pageContent: long(40), metadata: { source: "a.txt" } });
    await chunkDocuments([doc], { chunkSize: 200, chunkOverlap: 20 });
    expect(doc.metadata).toEqual({ source: "a.txt" });
  });
});

import { cleanText, processDocuments } from "../workshops/part-13/solution/process-documents.js";

describe("workshop: process-documents", () => {
  test("cleanText normalises whitespace and strips control characters", () => {
    expect(cleanText("  a\t\tb \r\n\r\n\r\n\r\nc\u0000d  ")).toBe("a b\n\ncd");
  });
  test("pipeline reports per-source stats and every chunk is traceable to a file", async () => {
    const r = await processDocuments("data/curriculum", { chunkSize: 400, chunkOverlap: 40 });
    expect(r.stats.length).toBeGreaterThanOrEqual(8);
    expect(r.chunks.every((c) => typeof c.metadata.source === "string" && c.metadata.source.length > 0)).toBe(true);
    expect(r.stats.reduce((n, s) => n + s.chunks, 0)).toBe(r.chunks.length);
    expect(r.stats.every((s) => s.chunks > 0 && s.maxChunkLength <= 400)).toBe(true);
  });
});
