// 02-06: Basic Error Handling
// แนวคิด: เรียก API ผ่านเครือข่ายล้มเหลวได้เสมอ — ต้องใช้ try/catch และแยกประเภทของ error
// ตัวอย่างนี้ "จงใจทำให้พัง" 3 แบบจริง (ไม่แก้ .env) และจำลอง 2 แบบที่ทำซ้ำยาก (429, 402)
import { initChatModel } from "langchain/chat_models/universal";
import { TOKENME_BASE_URL, TOKENME_MODEL } from "../../src/models/index.js";
import { requireEnv } from "../../src/utils/env.js";

/** แปลง error เป็นคำอธิบายที่ผู้ใช้เข้าใจ โดยดู HTTP status */
function explainError(err: unknown): string {
  const e = err as { status?: number; message?: string; code?: string; cause?: { code?: string } };
  const status = e.status;
  if (status === 401) return "API key ไม่ถูกต้อง (401) — ตรวจ .env";
  if (status === 404 || status === 400) return `Model name หรือ request ไม่ถูกต้อง (${status}) — ตรวจชื่อ model`;
  if (status === 402) return "ยอดเงิน/โควตาไม่พอ (402) — เติมเงินหรือเปลี่ยน provider";
  if (status === 429) return "เรียกถี่เกินไป (429 rate limit) — รอแล้วลองใหม่ (retry + backoff)";
  if (status && status >= 500) return `Provider มีปัญหา (${status}) — ลองใหม่ภายหลัง`;
  if (e.cause?.code || e.code || /connection/i.test(e.message ?? "")) return "เชื่อมต่อเครือข่ายไม่ได้ — ตรวจอินเทอร์เน็ต/base URL";
  return `ข้อผิดพลาดอื่น: ${e.message}`;
}

async function tryCall(label: string, modelName: string, options: { apiKey: string; baseURL?: string }) {
  try {
    const model = await initChatModel(modelName, {
      modelProvider: "openai", // TokenMe ใช้รูปแบบเดียวกับ OpenAI
      configuration: { baseURL: options.baseURL ?? TOKENME_BASE_URL },
      apiKey: options.apiKey,
      maxRetries: 0, // ปิด retry อัตโนมัติ เพื่อให้เห็น error ทันที
    });
    await model.invoke("hi");
    console.log(`[${label}] สำเร็จ`);
  } catch (err) {
    console.log(`[${label}] ❌ ${explainError(err)}`);
  }
}

const goodKey = requireEnv("TOKENME_API_KEY");
const GOOD_MODEL = TOKENME_MODEL;
await tryCall("API key ผิด", GOOD_MODEL, { apiKey: "invalid_key" });
await tryCall("ชื่อ model ผิด", "no-such-model", { apiKey: goodKey });
await tryCall("เครือข่ายล้มเหลว", GOOD_MODEL, { apiKey: goodKey, baseURL: "http://127.0.0.1:9" });

// 429 และ 402 ทำซ้ำจริงยาก/เสี่ยงเสียเงิน จึงจำลองด้วย object ที่มี status
console.log("[Rate limit]", "❌", explainError({ status: 429 }));
console.log("[ยอดเงินไม่พอ]", "❌", explainError({ status: 402 }));
