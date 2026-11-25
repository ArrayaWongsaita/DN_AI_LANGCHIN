import { describe, expect, test, vi } from "vitest";
import { SseParser, streamChat, type SseEvent } from "@/lib/sse";

const enc = new TextEncoder();
const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

describe("SseParser", () => {
  test("parses complete frames", () => {
    const p = new SseParser();
    expect(p.push(enc.encode(frame("token", { text: "a" }) + frame("done", { reply: "a" })))).toEqual([
      { event: "token", data: { text: "a" } },
      { event: "done", data: { reply: "a" } },
    ]);
  });

  test("a frame split across chunks is emitted only when complete", () => {
    const p = new SseParser();
    const all = enc.encode(frame("token", { text: "hello" }));
    expect(p.push(all.slice(0, 10))).toEqual([]);
    expect(p.push(all.slice(10, 20))).toEqual([]);
    expect(p.push(all.slice(20))).toEqual([{ event: "token", data: { text: "hello" } }]);
  });

  test("Thai multi-byte characters split in the middle of a code point survive", () => {
    const p = new SseParser();
    const bytes = enc.encode(frame("token", { text: "สวัสดีครับ" }));
    const out: SseEvent[] = [];
    for (let i = 0; i < bytes.length; i += 1) out.push(...p.push(bytes.slice(i, i + 1))); // ทีละไบต์ = แย่ที่สุด
    expect(out).toEqual([{ event: "token", data: { text: "สวัสดีครับ" } }]);
  });

  test("handles CRLF, ignores comments/unknown fields and malformed JSON frames", () => {
    const p = new SseParser();
    const out = p.push(enc.encode(`: keep-alive\n\nevent: token\r\ndata: {"text":"x"}\r\n\r\nevent: token\ndata: {not json}\n\nevent: done\ndata: {"reply":""}\n\n`));
    expect(out.map((e) => e.event)).toEqual(["token", "done"]);
  });
});

describe("streamChat", () => {
  const response = (chunks: Uint8Array[], status = 200) =>
    new Response(new ReadableStream({ start: (c) => (chunks.forEach((x) => c.enqueue(x)), c.close()) }), { status, headers: { "content-type": "text/event-stream" } });

  test("POSTs with the bearer token and forwards events in order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([enc.encode(frame("tool_start", { name: "getTasks" })), enc.encode(frame("token", { text: "ok" })), enc.encode(frame("done", { reply: "ok" }))]));
    const events: string[] = [];
    await streamChat("c1", "สวัสดี", { baseUrl: "http://api", token: "T", fetchImpl: fetchMock as unknown as typeof fetch, onEvent: (e) => events.push(e.event) });
    expect(events).toEqual(["tool_start", "token", "done"]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api/conversations/c1/chat/stream");
    expect(init.headers.Authorization).toBe("Bearer T");
    expect(JSON.parse(init.body)).toEqual({ message: "สวัสดี" });
  });

  test("stop: aborting the signal aborts the fetch and resolves quietly", async () => {
    const ac = new AbortController();
    const fetchMock = vi.fn((_u: string, init: RequestInit) => new Promise<Response>((_res, rej) => init.signal!.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")))));
    const p = streamChat("c1", "x", { baseUrl: "http://api", token: "T", signal: ac.signal, fetchImpl: fetchMock as unknown as typeof fetch, onEvent: () => undefined });
    ac.abort();
    await expect(p).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]![1]!.signal!.aborted).toBe(true);
  });

  test("HTTP errors throw ApiError with the Thai message from the server; 401 calls onUnauthorized", async () => {
    const err = (status: number, message: string) => new Response(JSON.stringify({ statusCode: status, message }), { status });
    await expect(streamChat("c", "x", { baseUrl: "http://api", token: "T", fetchImpl: (async () => err(409, "มีคำขออนุมัติค้างอยู่")) as unknown as typeof fetch, onEvent: () => undefined })).rejects.toMatchObject({ status: 409, message: "มีคำขออนุมัติค้างอยู่" });
    const onUnauthorized = vi.fn();
    await expect(streamChat("c", "x", { baseUrl: "http://api", token: "T", onUnauthorized, fetchImpl: (async () => err(401, "ต้องเข้าสู่ระบบ")) as unknown as typeof fetch, onEvent: () => undefined })).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});
