// 08-09: Handle Rate Limit
// แนวคิด: เจอ HTTP 429 → รอแล้วลองใหม่ โดยเพิ่มเวลารอเป็นเท่าตัว (exponential backoff)
// ตัวอย่างใช้ "model ปลอมที่ตอบ 429 สองครั้งแรก" (src/utils/throttled-model.ts) — ทำซ้ำได้แน่นอนและไม่เสียโควตา
import { createThrottledMockModel } from "../../src/utils/throttled-model.js";
import { messageText } from "../../src/utils/text.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ลองใหม่เฉพาะ error ชั่วคราว (429 / 5xx) เว้นช่วง 200, 400, 800 ms … ไม่ retry 401/404 */
async function withBackoff<T>(fn: () => Promise<T>, maxRetries = 4, baseMs = 200): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number }).status;
      const retryable = status === 429 || (status !== undefined && status >= 500);
      if (!retryable || attempt >= maxRetries) throw err;
      const wait = baseMs * 2 ** attempt;
      console.log(`  ครั้งที่ ${attempt + 1} ล้มเหลว (HTTP ${status}) → รอ ${wait} ms แล้วลองใหม่`);
      await sleep(wait);
    }
  }
}

console.log("(1) 429 สองครั้งแล้วสำเร็จ:");
const model = createThrottledMockModel({ failFirst: 2, text: "สำเร็จแล้ว!" });
const r = await withBackoff(() => model.invoke("hi"));
console.log(`  ผลลัพธ์: ${messageText(r)} (เรียกทั้งหมด ${model.calls} ครั้ง)`);

console.log("\n(2) 429 ตลอด → เกินจำนวนครั้งที่ลองได้ ต้อง throw:");
try {
  await withBackoff(() => createThrottledMockModel({ failFirst: 99, text: "x" }).invoke("hi"), 2, 100);
} catch (e) {
  console.log("  ❌", (e as Error).message);
}

console.log("\n(3) error ที่ไม่ควร retry (เช่น 401) → throw ทันที:");
try {
  await withBackoff(async () => {
    throw Object.assign(new Error("401 Invalid API Key"), { status: 401 });
  });
} catch (e) {
  console.log("  ❌", (e as Error).message);
}
// ใน production: ใช้ maxRetries ของ model (มี backoff ในตัว) + จำกัด concurrency (08-07) + เคารพ header Retry-After ถ้ามี
