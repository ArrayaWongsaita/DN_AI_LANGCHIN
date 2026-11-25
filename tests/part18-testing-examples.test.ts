import { describe, expect, test } from "vitest";
import { run as r01 } from "../examples/part-18/18-01-unit-test-tool.js";
import { run as r02 } from "../examples/part-18/18-02-test-tool-validation.js";
import { run as r03 } from "../examples/part-18/18-03-mock-external-api.js";
import { run as r04 } from "../examples/part-18/18-04-mock-chat-model.js";
import { run as r05 } from "../examples/part-18/18-05-test-structured-output.js";
import { run as r06 } from "../examples/part-18/18-06-test-agent-tool-calls.js";
import { run as r07 } from "../examples/part-18/18-07-test-agent-side-effects.js";

// ตัวอย่าง 18-01…18-07 ออกแบบให้รันออฟไลน์ได้ — เทสต์นี้ import run() มาตรวจผลที่ระบุใน README
describe("Part 18 testing examples (offline)", () => {
  test("18-01 unit test tool", async () => expect(await r01()).toMatchObject({ sum: "5", u1Count: 4 }));
  test("18-02 tool validation rejects bad input and leaves data intact", async () =>
    expect(await r02()).toMatchObject({ countAfter: 3, rejected: expect.arrayContaining(["title ว่าง", "status นอก enum"]) }));
  test("18-03 mock external API: retry once, give up, no retry on 404", async () =>
    expect(await r03()).toEqual({ result: "กรุงเทพ 34°C", flakyCalls: 2, downCalls: expect.any(Number), notFoundCalls: 1 }));
  test("18-04 mock chat model records the prompt", async () => expect(await r04()).toMatchObject({ calls: 3 }));
  test("18-05 structured output: invalid fields caught", async () =>
    expect(await r05()).toEqual({ valid: true, invalidFields: ["dueDate", "priority"] }));
  test("18-06 agent tool-call trajectory", async () => expect(await r06()).toBeDefined());
  test("18-07 side effects only after approval, other user's data safe", async () =>
    expect(await r07()).toEqual({ deletedT2: true, otherUserSafe: true }));
});
