// Workshop 02 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
// รัน: pnpm exec tsx --env-file=.env workshops/part-02/starter/hello-world.ts
import { createInterface } from "node:readline/promises";
import { initChatModel } from "langchain/chat_models/universal";
import { requireEnv } from "../../../src/utils/env.js";
import { messageText } from "../../../src/utils/text.js";

// TODO 1: สร้าง model ด้วย initChatModel("openai/gpt-oss-20b", { modelProvider: "groq", apiKey: requireEnv("GROQ_API_KEY") })
// TODO 2: อ่านคำถามจาก Terminal ด้วย createInterface + rl.question  (ถ้าว่าง → แจ้งแล้ว process.exit(0))
// TODO 3: เรียก model.invoke(question) แล้วแสดง messageText(response)
// TODO 4: ครอบด้วย try/catch — ถ้าล้มให้แสดงสาเหตุ (HTTP status) แทน stack trace แล้ว process.exit(1)
void [createInterface, initChatModel, requireEnv, messageText]; // ลบบรรทัดนี้เมื่อใช้ครบแล้ว
console.log("TODO: เขียนโปรแกรมตามโจทย์");
