import { parseArgs } from "node:util";
import { createEmbeddings } from "../../../src/embeddings/index.js";
import { createChatModel } from "../../../src/models/index.js";
import { CURRICULUM_TABLE, createCurriculumRetriever, indexCurriculum } from "../../../src/rag/curriculum-index.js";
import { createPgVectorStore, resetTable } from "../../../src/rag/pg-store.js";
import { answerWithRag } from "../../../src/rag/rag.js";
import { withDb } from "../../../src/utils/db.js";
import { isMain } from "../../../src/utils/is-main.js";
import { retryAsync } from "../../../src/utils/retry.js";

if (isMain(import.meta.url)) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { provider: { type: "string" }, reset: { type: "boolean" } },
  });
  const [command, ...rest] = positionals;
  try {
    await withDb(async (pool) => {
      const docEmbeddings = createEmbeddings("RETRIEVAL_DOCUMENT");
      if (command === "index") {
        if (values.reset) await resetTable(CURRICULUM_TABLE, { pool });
        const r = await retryAsync(() => indexCurriculum({ embeddings: docEmbeddings, pool }), { delayMs: 15000 });
        console.log(`index เสร็จ: ${r.chunks} chunk | ส่งไป embed รอบนี้: ${r.embedded}${r.warnings.length ? ` | warnings: ${r.warnings.join("; ")}` : ""}`);
      } else if (command === "ask") {
        const question = rest.join(" ").trim();
        if (!question) throw new Error('ใช้: curriculum-assistant.ts ask "คำถาม" [--provider tokenme|groq|deepseek]');
        await retryAsync(() => indexCurriculum({ embeddings: docEmbeddings, pool }), { delayMs: 15000 }); // ครั้งแรกเท่านั้นที่ embed
        const store = await createPgVectorStore({ embeddings: docEmbeddings, tableName: CURRICULUM_TABLE, pool });
        const retriever = createCurriculumRetriever(store, { queryEmbeddings: createEmbeddings("RETRIEVAL_QUERY") });
        const provider = values.provider === "deepseek" || values.provider === "groq" ? values.provider : "tokenme";
        const model = await createChatModel({ provider, maxTokens: 1500, ...(provider === "deepseek" ? { thinking: false } : {}) });
        const r = await retryAsync(() => answerWithRag({ question, retriever, model }));
        console.log(`คำถาม: ${question}\nคำตอบ: ${r.answer}`);
        console.log(`แหล่งที่มา: ${r.sources.length ? r.sources.map((s) => `[${s.n}] ${s.source}`).join(", ") : "-"}${r.usedContext ? "" : " (ไม่ได้ใช้เอกสาร)"}`);
      } else {
        throw new Error('ใช้: curriculum-assistant.ts index [--reset] | curriculum-assistant.ts ask "คำถาม" [--provider groq|deepseek]');
      }
    });
  } catch (e) {
    console.error("❌", (e as Error).message);
    process.exitCode = 1;
  }
}
