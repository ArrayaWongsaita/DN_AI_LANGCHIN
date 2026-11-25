import { describe, expect, test } from "vitest";
import { createThrottledMockModel } from "../src/utils/throttled-model.js";
import { messageText } from "../src/utils/text.js";

describe("createThrottledMockModel", () => {
  test("rejects with status 429 for the first failFirst calls, then resolves with text", async () => {
    const model = createThrottledMockModel({ failFirst: 2, text: "ok" });
    for (let i = 0; i < 2; i++) {
      await expect(model.invoke("x")).rejects.toMatchObject({ status: 429 });
    }
    expect(messageText(await model.invoke("x"))).toBe("ok");
  });

  test("failFirst: 0 never throws", async () => {
    const model = createThrottledMockModel({ failFirst: 0, text: "fine" });
    expect(messageText(await model.invoke("x"))).toBe("fine");
  });

  test("each instance keeps its own call counter", async () => {
    const a = createThrottledMockModel({ failFirst: 1, text: "a" });
    const b = createThrottledMockModel({ failFirst: 1, text: "b" });
    await expect(a.invoke("x")).rejects.toMatchObject({ status: 429 });
    await expect(b.invoke("x")).rejects.toMatchObject({ status: 429 });
  });
});
