import { describe, expect, test, vi } from "vitest";
import { ApiClient, ApiError } from "@/lib/api";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("ApiClient", () => {
  test("adds the bearer token and parses JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, [{ id: "1" }]));
    const api = new ApiClient({ baseUrl: "http://api", getToken: () => "TOK", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(await api.get("/tasks")).toEqual([{ id: "1" }]);
    expect(fetchImpl.mock.calls[0]![1].headers.Authorization).toBe("Bearer TOK");
  });

  test("401 invokes onUnauthorized (redirect to login) and throws ApiError", async () => {
    const onUnauthorized = vi.fn();
    const api = new ApiClient({ baseUrl: "http://api", getToken: () => "TOK", onUnauthorized, fetchImpl: (async () => json(401, { statusCode: 401, message: "token หมดอายุ" })) as unknown as typeof fetch });
    await expect(api.get("/tasks")).rejects.toMatchObject({ status: 401, message: "token หมดอายุ" });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  test("login/register 401 (wrong password) does NOT redirect — the form shows the message", async () => {
    const onUnauthorized = vi.fn();
    const api = new ApiClient({ baseUrl: "http://api", getToken: () => null, onUnauthorized, fetchImpl: (async () => json(401, { statusCode: 401, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" })) as unknown as typeof fetch });
    await expect(api.post("/auth/login", { email: "a", password: "b" }, { auth: false })).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  test("204 resolves undefined; network failure becomes a Thai ApiError", async () => {
    const api = new ApiClient({ baseUrl: "http://api", getToken: () => "T", fetchImpl: (async () => new Response(null, { status: 204 })) as unknown as typeof fetch });
    expect(await api.del("/tasks/1")).toBeUndefined();
    const down = new ApiClient({ baseUrl: "http://api", getToken: () => "T", fetchImpl: (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch });
    await expect(down.get("/tasks")).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/เชื่อมต่อ/) });
  });
});
