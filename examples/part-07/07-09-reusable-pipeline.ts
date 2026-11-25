// 07-09: Reusable Pipeline
// แนวคิด: ห่อ pipeline เป็นฟังก์ชัน/โมดูล (src/pipelines/explain.ts) รับ model เป็นพารามิเตอร์ → ใช้ซ้ำ ทดสอบง่าย
// และจัดการ error ด้วย withRetry / withFallbacks
import { RunnableLambda } from "@langchain/core/runnables";
import { AIMessage } from "@langchain/core/messages";
import { buildExplainPipeline } from "../../src/pipelines/explain.js";
import { createChatModel } from "../../src/models/index.js";
import { createMockChatModel } from "../../src/utils/mock-model.js";

const input = { topic: "Recursion", audience: "เด็กประถม" };

// 1) ใช้กับ model จริง
const real = await createChatModel({ maxTokens: 1500 });
console.log("[model จริง]", (await buildExplainPipeline(real).invoke(input)).trim());

// 2) ใช้ซ้ำกับ model ปลอม (ทดสอบโดยไม่เสียโควตา)
const mock = createMockChatModel(["(คำตอบจำลอง) ฟังก์ชันที่เรียกตัวเอง"]);
console.log("[model ปลอม]", await buildExplainPipeline(mock).invoke(input));

// 3) Error handling: ตัวหลักล้มเหลว → ลองใหม่ → ถ้ายังล้มเหลวใช้ตัวสำรอง
let calls = 0;
const flaky = RunnableLambda.from(async (): Promise<AIMessage> => {
  calls++;
  throw new Error("provider ล่ม (จำลอง)");
});
const backup = RunnableLambda.from(async () => new AIMessage("(ตัวสำรองตอบแทน)"));

const safe = buildExplainPipeline(flaky.withRetry({ stopAfterAttempt: 2 }).withFallbacks([backup]));
console.log("[หลัก→สำรอง]", await safe.invoke(input), `| ตัวหลักถูกเรียก ${calls} ครั้ง`);
