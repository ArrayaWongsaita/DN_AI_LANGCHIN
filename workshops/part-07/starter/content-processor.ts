// Workshop 07 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
import { type Runnable } from "@langchain/core/runnables";

export type Sentiment = "positive" | "neutral" | "negative";
export interface ContentResult {
  summary: string;
  keywords: string[];
  sentiment: Sentiment;
  title: string;
}

/** "a, b, c" → ["a","b","c"] (ตัดช่องว่าง ไม่ซ้ำ ไม่เกิน 8 คำ) */
export function parseKeywords(text: string): string[] {
  void text;
  throw new Error("TODO: ยังไม่ได้ทำ");
}

/** แปลงคำตอบ model เป็น sentiment ที่อนุญาต; ไม่รู้จัก → neutral */
export function parseSentiment(text: string): Sentiment {
  void text;
  throw new Error("TODO: ยังไม่ได้ทำ");
}

/**
 * pipeline: validate (article ว่าง = error) → 4 สาขาขนานกัน (summary | keywords | sentiment | title)
 * ใบ้: ChatPromptTemplate → pipe(model) → pipe(StringOutputParser) ต่อสาขา, รวมด้วย RunnableParallel.from({...})
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildContentProcessor(model: Runnable<any, any>): Runnable<{ article: string }, ContentResult> {
  void model;
  throw new Error("TODO: ยังไม่ได้ทำ");
}
