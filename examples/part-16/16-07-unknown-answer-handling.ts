// 16-07: Unknown Answer Handling
// แนวคิด: ระบบที่ดีต้อง "ยอมรับว่าไม่รู้" มี 2 ชั้น — (1) ค้นไม่เจออะไรใกล้เลย → ไม่เรียกโมเดลเลย (2) เจอเอกสารใกล้ๆ แต่ไม่มีคำตอบ → prompt บังคับให้ตอบ NOT_FOUND
import { createChatModel } from "../../src/models/index.js";
import { answerWithRag } from "../../src/rag/rag.js";
import { retryAsync } from "../../src/utils/retry.js";
import { withKnowledgeBase } from "./_kb.js";

const real = await createChatModel({ maxTokens: 1500 });
let modelCalls = 0;
const model = { invoke: async (m: Parameters<typeof real.invoke>[0]) => (modelCalls++, real.invoke(m)) };

await withKnowledgeBase(async ({ retriever }) => {
  for (const [label, q] of [
    ["นอกขอบเขตโดยสิ้นเชิง", "ราคาน้ำมันวันนี้เท่าไร"],
    ["ใกล้เคียงแต่ไม่มีในเอกสาร", "ครูประจำชั้น ม.1/1 ชื่ออะไร"],
    ["มีในเอกสาร", "ต้องมีเวลาเรียนกี่เปอร์เซ็นต์ถึงสอบปลายภาคได้"],
  ] as const) {
    const before = modelCalls;
    const r = await retryAsync(() => answerWithRag({ question: q, retriever, model }));
    console.log(`\n[${label}] ${q}\n  → ${r.answer}\n  (เรียกโมเดล ${modelCalls - before} ครั้ง, usedContext: ${r.usedContext})`);
  }
});
