// 16-04: RAG with LCEL
// แนวคิด: ประกอบ RAG เป็น chain ด้วย LCEL (Part 08): { context: retriever→format, question } | prompt | model | parser
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableLambda, RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { createChatModel } from "../../src/models/index.js";
import { buildRagPrompt, formatContext } from "../../src/rag/rag.js";
import { retryAsync } from "../../src/utils/retry.js";
import { withKnowledgeBase } from "./_kb.js";

const model = await createChatModel({ maxTokens: 1500 });

await withKnowledgeBase(async ({ retriever }) => {
  const chain = RunnableSequence.from([
    {
      context: RunnableLambda.from(async (q: string) => formatContext(await retriever.invoke(q))),
      question: new RunnablePassthrough<string>(),
    },
    buildRagPrompt(),
    model,
    new StringOutputParser(),
  ]);
  console.log("ขั้นตอนใน chain:", chain.steps.map((s) => s.constructor.name).join(" → "));
  const answer = await retryAsync(() => chain.invoke("สมุดบันทึกการอ่านวิชาภาษาไทยต้องส่งวันไหน และส่งช้าโดนหักเท่าไร"));
  console.log("\nคำตอบ:", answer.trim());
});
