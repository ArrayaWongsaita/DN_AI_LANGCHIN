import { pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";
import { isMain } from "../src/utils/is-main.js";

describe("isMain", () => {
  test("true for a path with Thai characters and spaces", () => {
    const p = "/Users/ผู้เรียน/my project/solution/tool.ts";
    expect(isMain(pathToFileURL(p).href, p)).toBe(true);
  });
  test("false for a different file", () => {
    expect(isMain(pathToFileURL("/a/b.ts").href, "/a/c.ts")).toBe(false);
  });
  test("false when argv[1] is missing", () => {
    expect(isMain("file:///a/b.ts", undefined)).toBe(false);
  });
});
