// Workshop 02 — เฉลย: AI Hello World
// รับคำถามจาก Terminal แล้วแสดงคำตอบ; ถ้าเรียก model ไม่สำเร็จให้แจ้งสาเหตุแทนที่จะ crash
import { createInterface } from "node:readline/promises";
import { initChatModel } from "langchain/chat_models/universal";
import { requireEnv } from "../../../src/utils/env.js";
import { messageText } from "../../../src/utils/text.js";

const model = await initChatModel("openai/gpt-oss-20b", {
  modelProvider: "groq",
  apiKey: requireEnv("GROQ_API_KEY"),
  maxRetries: 1,
});

const rl = createInterface({ input: process.stdin, output: process.stdout });
const question = (await rl.question("ถามอะไรดี? > ")).trim();
rl.close();

if (!question) {
  console.log("ไม่ได้พิมพ์คำถาม");
  process.exit(0);
}

try {
  const response = await model.invoke(question);
  console.log("\nAI:", messageText(response));
} catch (err) {
  const status = (err as { status?: number }).status;
  console.error(`\n❌ เรียก AI ไม่สำเร็จ${status ? ` (HTTP ${status})` : ""}: ${(err as Error).message}`);
  process.exit(1);
}
