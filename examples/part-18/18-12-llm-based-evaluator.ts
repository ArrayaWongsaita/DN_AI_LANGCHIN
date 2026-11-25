// 18-12: LLM-based Evaluator (LLM-as-a-judge)
// แนวคิด: บางเรื่องกฎตรวจไม่ได้ ("คำตอบสุภาพ/ตรงสาระไหม") → ให้ model อีกตัวให้คะแนนเทียบ "คำตอบอ้างอิง" ในรูป evaluator ของ LangSmith
// ⚠️ ข้อจำกัด: judge ลำเอียง/ไม่นิ่ง/เสียเงิน และถูกหลอกได้ด้วยข้อความในคำตอบ — ใช้เสริมกฎ ไม่ใช่แทน และควรสุ่มตรวจด้วยคน
import { evaluate } from "langsmith/evaluation";
import { Client } from "langsmith";
import { requireLangSmith } from "../../src/utils/langsmith.js";
import { uploadDataset } from "../../src/eval/dataset.js";
import { approvalGate, llmJudge, ruleBased, toolSelection } from "../../src/eval/evaluators.js";
import { toLangSmithEvaluator } from "../../src/eval/langsmith.js";
import { createChatModel } from "../../src/models/index.js";
import { DATASET_NAME, EXAMPLE_CASES, countFailedRows, createAgentRunner, createEvalModel } from "./_eval.js";

requireLangSmith();
const client = new Client();
await uploadDataset(client, DATASET_NAME, EXAMPLE_CASES); // มีอยู่แล้วก็ข้าม

const agentModel = await createEvalModel(); // EVAL_PROVIDER=deepseek เพื่อใช้ DeepSeek แทน Groq
const judgeModel = await createChatModel({ provider: "deepseek", thinking: false, maxTokens: 400 }); // judge คนละ model กับตัวที่ถูกตรวจ ลด bias
const target = createAgentRunner(agentModel, { pauseMs: 6000 });

const results = await evaluate((inputs: { question: string; role?: string }) => target(inputs), {
  data: DATASET_NAME,
  client,
  evaluators: [toolSelection, ruleBased, approvalGate, llmJudge(judgeModel)].map(toLangSmithEvaluator),
  experimentPrefix: "task-agent-judge",
  maxConcurrency: 1,
});

const failed = countFailedRows(results.results);
if (failed > 0) console.warn(`\n⚠️  agent พัง ${failed}/${EXAMPLE_CASES.length} กรณี (เช่น rate limit) — ค่าเฉลี่ยด้านล่างไม่ครบ`);
console.log("\nผลต่อกรณี:");
const totals: Record<string, number[]> = {};
for (const row of results.results) {
  const id = String((row.example.metadata as { id?: string } | undefined)?.id ?? row.example.id);
  const scores = row.evaluationResults.results.map((r) => {
    (totals[r.key] ??= []).push(Number(r.score));
    return `${r.key}=${r.score}`;
  });
  console.log(`  ${id.padEnd(15)} ${scores.join(" ")}`);
  for (const r of row.evaluationResults.results.filter((x) => x.key === "judge" && x.comment)) console.log(`    ↳ judge: ${r.comment}`);
}
console.log("\nค่าเฉลี่ยต่อ evaluator:");
for (const [k, v] of Object.entries(totals)) console.log(`  ${k.padEnd(15)} ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)}  (n=${v.length})`);
console.log(`\nดูผลละเอียดที่ LangSmith → Datasets & Experiments → "${DATASET_NAME}" → experiment "${results.experimentName}"`);
