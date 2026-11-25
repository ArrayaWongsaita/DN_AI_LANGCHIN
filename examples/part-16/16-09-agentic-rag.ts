// 16-09: Agentic RAG
// แนวคิด: agent ค้นได้หลายครั้ง/หลายคำค้นตามที่ต้องการ (เหมาะกับคำถามที่ต้องรวมข้อมูลหลายแหล่ง) — แลกกับ latency/ค่าใช้จ่ายและความไม่แน่นอน
// basic RAG = ค้น 1 ครั้งเสมอ | agentic RAG = โมเดลเลือก (ตั้งเพดาน: system prompt + recursionLimit)
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";
import { z } from "zod";
import { createChatModel } from "../../src/models/index.js";
import { formatContext } from "../../src/rag/rag.js";
import { retryAsync } from "../../src/utils/retry.js";
import { messageText } from "../../src/utils/text.js";
import { withKnowledgeBase } from "./_kb.js";

await withKnowledgeBase(async ({ retriever }) => {
  const queries: string[] = [];
  const searchCurriculum = tool(
    async ({ query }) => {
      queries.push(query);
      return formatContext(await retriever.invoke(query)) || "ไม่พบข้อมูลที่เกี่ยวข้องในเอกสาร";
    },
    { name: "searchCurriculum", description: "ค้นเอกสารหลักสูตรและระเบียบโรงเรียน (คะแนน เวลาเรียน กิจกรรม ค่าใช้จ่าย) ค้นทีละหัวข้อ", schema: z.object({ query: z.string() }) },
  );
  const agent = createAgent({
    model: await createChatModel({ maxTokens: 2500 }),
    tools: [searchCurriculum],
    systemPrompt: [
      "ตอบเป็นภาษาไทยจากผลค้นเท่านั้น อ้างอิงแหล่งที่มาด้วย [n] ถ้าไม่พบให้บอกว่า 'ไม่พบข้อมูลที่เกี่ยวข้องในเอกสาร'",
      "ค้นไม่เกิน 3 ครั้ง; คำถามที่เกี่ยวหลายวิชาให้ค้นทีละวิชา",
    ].join("\n"),
  });

  const q = "เปรียบเทียบสัดส่วนคะแนนสอบปลายภาคของวิชาคณิตศาสตร์กับวิชาวิทยาศาสตร์ ม.1 ว่าวิชาไหนมากกว่า";
  const r = await retryAsync(() => agent.invoke({ messages: [{ role: "user", content: q }] }, { recursionLimit: 10 }));
  console.log(`คำถาม: ${q}\n\nค้น ${queries.length} ครั้ง:`);
  queries.forEach((x, i) => console.log(`  ${i + 1}. "${x}"`));
  console.log("\nคำตอบ:", messageText(r.messages.at(-1)!).trim());
});
