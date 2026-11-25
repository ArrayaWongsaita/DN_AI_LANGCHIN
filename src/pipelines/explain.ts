import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { Runnable } from "@langchain/core/runnables";

/**
 * Pipeline "อธิบายหัวข้อให้ผู้ฟังกลุ่มหนึ่ง": prompt → model → string
 * รับ model เป็นพารามิเตอร์ เพื่อสลับ provider หรือใช้ model ปลอมทดสอบได้ (Part 07-09)
 */
export function buildExplainPipeline(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Runnable<any, any>,
): Runnable<{ topic: string; audience: string }, string> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "คุณเป็นผู้อธิบายที่เก่ง อธิบายให้{audience}เข้าใจใน 2 ประโยค"],
    ["human", "หัวข้อ: {topic}"],
  ]);
  return prompt.pipe(model).pipe(new StringOutputParser());
}
