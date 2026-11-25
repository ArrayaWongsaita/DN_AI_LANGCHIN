// 17-09: Model Retry and Fallback
// แนวคิด: reliability ที่ชั้น middleware — error ชั่วคราว (503/429/timeout) → retry พร้อม backoff; ล้มถาวร → สลับไป model สำรอง
import { createAgent, modelFallbackMiddleware, modelRetryMiddleware } from "langchain";
import { createTaskTools } from "../../src/data/tasks.js";
import { createChatModel } from "../../src/models/index.js";
import { createFlakyModel } from "../../src/utils/flaky-model.js";
import { ask, contextSchema, newStore, somchai } from "./_shared.js";

const tools = createTaskTools(newStore());

// A) model ที่ล้มชั่วคราว 2 ครั้งแรก (จำลอง 503) แล้วกลับมาปกติ → modelRetry ลองใหม่จนสำเร็จ
const flaky = createFlakyModel(await createChatModel({ maxTokens: 1500 }), 2, "503 service unavailable (จำลอง)");
const retrying = createAgent({
  model: flaky,
  tools,
  contextSchema,
  middleware: [
    modelRetryMiddleware({ maxRetries: 3, initialDelayMs: 500, jitter: false, retryOn: (e) => /503|429|timeout/i.test(e.message) }),
  ],
});
console.log("A) retry: ตอบ =", await ask(retrying, "สวัสดี ตอบสั้นๆ", somchai("viewer")));
console.log(`   เรียก model ทั้งหมด ${flaky.callCount} ครั้ง (2 ล้ม + 1 สำเร็จ)`);

// B) model หลักใช้ชื่อ model ที่ไม่มีอยู่จริง (ล้มถาวร) → modelFallback สลับไป DeepSeek
const broken = await createChatModel({ model: "openai/model-that-does-not-exist", maxRetries: 0 });
const backup = await createChatModel({ provider: "deepseek", thinking: false, maxTokens: 1500 });
const withFallback = createAgent({
  model: broken,
  tools,
  contextSchema,
  middleware: [modelFallbackMiddleware(backup)],
});
console.log("\nB) fallback: ตอบ =", await ask(withFallback, "สวัสดี ตอบสั้นๆ", somchai("viewer")));
