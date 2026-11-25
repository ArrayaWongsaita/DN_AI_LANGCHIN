import { describe, expect, test, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { submitDecision } from "@/lib/approval";

const approvalId = "ap1";
const conv = "c1";

function fakeApi(post: () => Promise<unknown>, pending: { id: string }[] = []) {
  return { post: vi.fn(post), get: vi.fn(async () => pending) } as unknown as Parameters<typeof submitDecision>[0];
}

describe("submitDecision", () => {
  test("returns the assistant reply when the server accepts the decision", async () => {
    const api = fakeApi(async () => ({ reply: "ลบแล้ว" }));
    await expect(submitDecision(api, conv, approvalId, "approve")).resolves.toEqual({ closed: true, reply: "ลบแล้ว" });
  });

  test("on 409 where the approval is no longer pending (stale/decided elsewhere) the dialog is closed instead of staying stuck", async () => {
    const api = fakeApi(async () => { throw new ApiError(409, "คำขอนี้หมดอายุ"); }, []);
    await expect(submitDecision(api, conv, approvalId, "approve")).resolves.toEqual({ closed: true, reply: "" });
  });

  test("on 409 where the approval is still pending (e.g. being processed) the error is rethrown so the user can retry", async () => {
    const api = fakeApi(async () => { throw new ApiError(409, "กำลังถูกประมวลผล"); }, [{ id: approvalId }]);
    await expect(submitDecision(api, conv, approvalId, "approve")).rejects.toThrow("กำลังถูกประมวลผล");
  });

  test("non-409 errors are rethrown untouched", async () => {
    const api = fakeApi(async () => { throw new ApiError(500, "พัง"); });
    await expect(submitDecision(api, conv, approvalId, "reject")).rejects.toThrow("พัง");
  });
});
