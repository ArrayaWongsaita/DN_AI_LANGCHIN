import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import {
  PlaygroundError,
  listExamples,
  resolveExample,
} from "../scripts/resolve-example.js";

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "examples-"));
  mkdirSync(join(root, "part-04"));
  writeFileSync(join(root, "part-04", "04-01-human-message.ts"), "");
  writeFileSync(join(root, "part-04", "04-02-system-message.ts"), "");
  writeFileSync(join(root, "part-04", "_helper.ts"), ""); // ไฟล์ช่วย ไม่ใช่ตัวอย่าง
});

describe("resolveExample", () => {
  test("resolves short form 4-1", () => {
    const r = resolveExample("4-1", root);
    expect(r.part).toBe(4);
    expect(r.index).toBe(1);
    expect(r.file.endsWith("04-01-human-message.ts")).toBe(true);
  });

  test("resolves padded form 04-01 to the same file", () => {
    expect(resolveExample("04-01", root).file).toBe(resolveExample("4-1", root).file);
  });

  test.each(["abc", "4", "0-1", "4-0", "4-1-2"])("rejects malformed arg %s", (arg) => {
    expect(() => resolveExample(arg, root)).toThrow(PlaygroundError);
  });

  test("missing example error lists available files", () => {
    expect(() => resolveExample("4-9", root)).toThrow(/04-01-human-message\.ts/);
  });

  test("missing part throws PlaygroundError", () => {
    expect(() => resolveExample("9-99", root)).toThrow(PlaygroundError);
  });
});

describe("listExamples", () => {
  test("returns sorted file names for a part", () => {
    expect(listExamples(4, root)).toEqual([
      "04-01-human-message.ts",
      "04-02-system-message.ts",
    ]);
  });

  test("returns [] for a part without examples", () => {
    expect(listExamples(9, root)).toEqual([]);
  });
});
