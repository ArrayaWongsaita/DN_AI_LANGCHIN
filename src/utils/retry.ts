/** error ชั่วคราวที่ลองใหม่ได้: Groq gpt-oss ทำชื่อ tool เพี้ยน (tool_use_failed) หรือ structured output parse ไม่ได้ (output_parse_failed), 429, 5xx */
export function isTransientModelError(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  if (e.status === 429 || (e.status !== undefined && e.status >= 500)) return true;
  return /tool_use_failed|output_parse_failed|<\|channel\|>/.test(e.message ?? "");
}

/** ลองใหม่เมื่อเจอ error ชั่วคราว (เว้นช่วงเพิ่มเป็นเท่าตัว); error อื่นโยนทันที */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; delayMs?: number; shouldRetry?: (err: unknown) => boolean } = {},
): Promise<T> {
  const { attempts = 4, delayMs = 500, shouldRetry = isTransientModelError } = opts;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts || !shouldRetry(err)) throw err;
      await new Promise((r) => setTimeout(r, delayMs * 2 ** (attempt - 1)));
    }
  }
}
