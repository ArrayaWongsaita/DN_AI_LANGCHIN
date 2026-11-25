// Workshop 03 — เฉลย: ส่ง prompt เดียวกันไปยังหลาย model/config แล้วเปรียบเทียบ ความเร็ว token และคำตอบ
import { createChatModel, type ChatModelOptions } from "../../../src/models/index.js";
import { messageText } from "../../../src/utils/text.js";

const prompt = "แนะนำ 3 เคล็ดลับการเรียนเขียนโปรแกรมสำหรับมือใหม่ ข้อละไม่เกิน 1 ประโยค";

const candidates: { label: string; options: ChatModelOptions }[] = [
  { label: "tokenme v4.1-flash t=0", options: { temperature: 0, thinking: false } },
  { label: "tokenme v4.1-flash t=1", options: { temperature: 1, thinking: false } },
  { label: "tokenme qwen3.8-27b t=0", options: { model: "unsloth/qwen3.8-27b-nvfp4", temperature: 0, thinking: false } },
  { label: "groq gpt-oss-20b t=0", options: { provider: "groq", temperature: 0 } },
  { label: "deepseek-flash t=0", options: { provider: "deepseek", temperature: 0, thinking: false } },
];

const rows: Record<string, string | number>[] = [];
const answers: string[] = [];

for (const { label, options } of candidates) {
  try {
    const model = await createChatModel({ maxTokens: 3000, ...options });
    const start = performance.now();
    const r = await model.invoke(prompt);
    const ms = Math.round(performance.now() - start);
    rows.push({
      config: label,
      "เวลา (ms)": ms,
      input: r.usage_metadata?.input_tokens ?? "-",
      output: r.usage_metadata?.output_tokens ?? "-",
      total: r.usage_metadata?.total_tokens ?? "-",
      finish: String(r.response_metadata?.finish_reason ?? "-"),
    });
    answers.push(`--- ${label} ---\n${messageText(r).trim()}`);
  } catch (err) {
    rows.push({ config: label, "เวลา (ms)": "-", input: "-", output: "-", total: "-", finish: `ข้าม: ${(err as Error).message.slice(0, 40)}` });
  }
}

console.table(rows);
console.log("\n" + answers.join("\n\n"));
console.log("\nบันทึกคุณภาพ: ให้คะแนน 1-5 ในตาราง my-notes.md (ถูกต้อง / ครบ / อ่านง่าย)");
