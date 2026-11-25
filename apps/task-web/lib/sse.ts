import { ApiError, toApiError } from "./api";

export type SseEvent = { event: string; data: unknown };

/** แยก SSE frame จากไบต์ที่ทยอยมา — TextDecoder แบบ stream กันตัวอักษรไทย (3 ไบต์) ที่ถูกตัดกลางชิ้น */
export class SseParser {
  private readonly decoder = new TextDecoder();
  private buffer = "";

  push(chunk: Uint8Array): SseEvent[] {
    this.buffer += this.decoder.decode(chunk, { stream: true });
    this.buffer = this.buffer.replace(/\r\n/g, "\n");
    const events: SseEvent[] = [];
    let idx: number;
    while ((idx = this.buffer.indexOf("\n\n")) !== -1) {
      const frame = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      }
      if (data.length === 0) continue; // comment / keep-alive
      try {
        events.push({ event, data: JSON.parse(data.join("\n")) });
      } catch {
        // frame เสีย: ข้ามไปแทนที่จะล้มทั้งสตรีม
      }
    }
    return events;
  }
}

export type StreamOptions = {
  baseUrl: string;
  token: string | null;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  onEvent: (e: SseEvent) => void;
  onUnauthorized?: () => void;
};

/** POST …/chat/stream แล้วส่ง event ทีละตัว — abort (ปุ่มหยุด) จบอย่างเงียบ ส่วน HTTP error โยน ApiError */
export async function streamChat(conversationId: string, message: string, o: StreamOptions): Promise<void> {
  try {
    const res = await (o.fetchImpl ?? fetch)(`${o.baseUrl}/conversations/${conversationId}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(o.token ? { Authorization: `Bearer ${o.token}` } : {}) },
      body: JSON.stringify({ message }),
      signal: o.signal,
    });
    if (!res.ok) {
      if (res.status === 401) o.onUnauthorized?.();
      throw await toApiError(res);
    }
    if (!res.body) throw new ApiError(0, "เซิร์ฟเวอร์ไม่ส่งสตรีมกลับมา");
    const parser = new SseParser();
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const e of parser.push(value)) o.onEvent(e);
    }
  } catch (e) {
    if (o.signal?.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า API ทำงานอยู่");
  }
}
