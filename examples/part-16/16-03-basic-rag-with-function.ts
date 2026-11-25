// 16-03: Basic RAG with Function
// แนวคิด: RAG สองขั้นเขียนเป็นฟังก์ชันเดียว: retrieve → format context → generate (ใช้ prompt จาก buildRagPrompt)
import type { Document } from "@langchain/core/documents";
import { createChatModel } from "../../src/models/index.js";
import { buildRagPrompt, formatContext } from "../../src/rag/rag.js";
import { retryAsync } from "../../src/utils/retry.js";
import { messageText } from "../../src/utils/text.js";
import { withKnowledgeBase } from "./_kb.js";

const model = await createChatModel({ maxTokens: 1500 });
const prompt = buildRagPrompt();

await withKnowledgeBase(async ({ retriever }) => {
  async function ragAnswer(question: string): Promise<string> {
    const docs: Document[] = await retriever.invoke(question); // 1) retrieve
    const messages = await prompt.formatMessages({ context: formatContext(docs), question }); // 2) augment
    return messageText(await retryAsync(() => model.invoke(messages))).trim(); // 3) generate
  }
  for (const q of ["ต้องมีเวลาเรียนกี่เปอร์เซ็นต์ถึงสอบปลายภาคได้", "ในห้องปฏิบัติการต้องสวมอะไรบ้าง"]) {
    console.log(`\nคำถาม: ${q}\nคำตอบ: ${await ragAnswer(q)}`);
  }
});
