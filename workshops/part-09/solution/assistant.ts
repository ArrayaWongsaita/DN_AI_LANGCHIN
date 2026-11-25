// Workshop 09 — เฉลย: AI Assistant ที่มี 6 tools (tool calling 1 รอบ)
// ใช้: pnpm exec tsx --env-file=.env workshops/part-09/solution/assistant.ts "<คำถาม>" [tokenme|groq|deepseek]
import { HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { executeToolCalls } from "../../../src/agents/execute-tools.js";
import { createChatModel, type ProviderName } from "../../../src/models/index.js";
import { workshopTools } from "../../../src/tools/index.js";
import { isMain } from "../../../src/utils/is-main.js";
import { messageText } from "../../../src/utils/text.js";

const SYSTEM = "คุณเป็นผู้ช่วย ใช้เครื่องมือเมื่อต้องคำนวณ ดูอากาศ ค้นหาสินค้า หรือดูวันที่ ห้ามเดาตัวเลข ตอบภาษาไทยสั้นๆ";

/** ถามหนึ่งคำถาม: โมเดลขอ tool → เรารันทุก call → ส่งผลกลับ → ได้คำตอบ (Part 10 จะทำเป็น loop) */
export async function askAssistant(model: BaseChatModel, question: string): Promise<{ answer: string; toolsUsed: string[] }> {
  const withTools = model.bindTools!(workshopTools);
  const messages: BaseMessage[] = [new SystemMessage(SYSTEM), new HumanMessage(question)];
  const ai = await withTools.invoke(messages);
  const toolsUsed = (ai.tool_calls ?? []).map((c) => c.name);
  if (toolsUsed.length === 0) return { answer: messageText(ai).trim(), toolsUsed };

  messages.push(ai, ...(await executeToolCalls(workshopTools, ai)));
  const final = await withTools.invoke(messages);
  return { answer: messageText(final).trim() || "(โมเดลไม่ตอบหลังได้ผล tool)", toolsUsed };
}

if (isMain(import.meta.url)) {
  const [question, provider] = process.argv.slice(2);
  if (!question || (provider && provider !== "tokenme" && provider !== "groq" && provider !== "deepseek")) {
    console.log('วิธีใช้: assistant.ts "<คำถาม>" [tokenme|groq|deepseek]');
    process.exit(1);
  }
  try {
    const model = await createChatModel({ provider: provider as ProviderName | undefined, thinking: false, maxTokens: 2000 });
    const { answer, toolsUsed } = await askAssistant(model, question);
    console.log(`tools: ${toolsUsed.join(", ") || "(ไม่ใช้)"}\n${answer}`);
  } catch (err) {
    console.error(`❌ ${(err as Error).message}`);
    process.exit(1);
  }
}
