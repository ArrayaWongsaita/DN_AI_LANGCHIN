// Workshop 08 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
import { type Runnable } from "@langchain/core/runnables";

export type TranslateResult = { text: string; ok: true; translation: string } | { text: string; ok: false; error: string };

/** ลองใหม่เฉพาะ 429/5xx โดยรอ baseMs, 2×, 4× … ไม่ retry error อื่น (เช่น 401) */
export async function withBackoff<T>(fn: () => Promise<T>, opts: { maxRetries?: number; baseMs?: number } = {}): Promise<T> {
  void [fn, opts];
  throw new Error("TODO: ยังไม่ได้ทำ");
}

/**
 * แปลทุกข้อความเป็นอังกฤษ: ผลเรียงตาม input · รายการที่ล้มไม่ทำให้รายการอื่นล้ม
 * · ทำพร้อมกันไม่เกิน maxConcurrency · retry เมื่อโดน 429 ใบ้: chain.batch(inputs, { maxConcurrency })
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function translateAll(model: Runnable<any, any>, texts: string[], opts: { maxConcurrency?: number; maxRetries?: number; baseMs?: number } = {}): Promise<TranslateResult[]> {
  void [model, texts, opts];
  throw new Error("TODO: ยังไม่ได้ทำ");
}
