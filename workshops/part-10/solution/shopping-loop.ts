// Workshop 10 — เฉลย: Shopping agent ที่ใช้ loop เอง (searchProduct + add + multiply)
// ใช้: pnpm exec tsx --env-file=.env workshops/part-10/solution/shopping-loop.ts "<คำสั่งซื้อ>" [tokenme|groq|deepseek]
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { runAgentLoop } from "../../../src/agents/agent-loop.js";
import { createChatModel, type ProviderName } from "../../../src/models/index.js";
import { add, multiply, searchProduct } from "../../../src/tools/index.js";
import { isMain } from "../../../src/utils/is-main.js";

const SYSTEM = [
  "คุณเป็นผู้ช่วยคำนวณยอดซื้อ ใช้ searchProduct หาราคาและจำนวนคงเหลือ ใช้ multiply/add คำนวณ ห้ามคำนวณเอง",
  "ถ้าสินค้าไม่พบหรือคงเหลือไม่พอ ให้แจ้งผู้ใช้ตรงๆ และไม่ต้องรวมยอดสินค้านั้น ตอบภาษาไทยสั้นๆ",
].join("\n");

export async function shop(question: string, provider?: ProviderName) {
  const model = await createChatModel({ provider, thinking: false, maxTokens: 2500 });
  return runAgentLoop({
    model,
    tools: [searchProduct, add, multiply],
    messages: [new SystemMessage(SYSTEM), new HumanMessage(question)],
    maxIterations: 8,
    onStep: ({ type, iteration, message }) => {
      if (type === "model") {
        const calls = (message as { tool_calls?: { name: string; args: unknown }[] }).tool_calls ?? [];
        for (const c of calls) console.log(`  รอบ ${iteration}: ${c.name}(${JSON.stringify(c.args)})`);
      }
    },
  });
}

if (isMain(import.meta.url)) {
  const [question, provider] = process.argv.slice(2);
  if (!question || (provider && provider !== "tokenme" && provider !== "groq" && provider !== "deepseek")) {
    console.log('วิธีใช้: shopping-loop.ts "<คำสั่งซื้อ>" [tokenme|groq|deepseek]');
    process.exit(1);
  }
  try {
    const r = await shop(question, provider as ProviderName | undefined);
    console.log(`[${r.stopReason} / ${r.iterations} รอบ]\n${r.finalText}`);
    if (r.stopReason !== "final") process.exitCode = 2;
  } catch (err) {
    console.error(`❌ ${(err as Error).message}`);
    process.exit(1);
  }
}
