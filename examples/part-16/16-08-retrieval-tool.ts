// 16-08: Retrieval Tool
// แนวคิด: ห่อ retriever เป็น tool → โมเดล "ตัดสินใจเอง" ว่าจะค้นไหมและค้นด้วยคำว่าอะไร (agentic RAG ขั้นแรก)
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { executeToolCalls } from "../../src/agents/execute-tools.js";
import { createChatModel } from "../../src/models/index.js";
import { formatContext } from "../../src/rag/rag.js";
import { retryAsync } from "../../src/utils/retry.js";
import { withKnowledgeBase } from "./_kb.js";

await withKnowledgeBase(async ({ retriever }) => {
  const searchCurriculum = tool(
    async ({ query }) => formatContext(await retriever.invoke(query)) || "ไม่พบข้อมูลที่เกี่ยวข้องในเอกสาร",
    {
      name: "searchCurriculum",
      description: "ค้นเอกสารหลักสูตรและระเบียบของโรงเรียนตัวอย่างวิทยา (คะแนน เวลาเรียน กิจกรรม ค่าใช้จ่าย) คืนข้อความที่เกี่ยวข้องพร้อมเลขอ้างอิง",
      schema: z.object({ query: z.string().describe("คำค้นสั้นๆ ที่ตรงประเด็น") }),
    },
  );
  const model = (await createChatModel({ maxTokens: 1500 })).bindTools!([searchCurriculum]);

  const ai = await retryAsync(() => model.invoke([{ role: "user", content: "ค่าเข้าค่ายลูกเสือเท่าไร" }]));
  console.log("โมเดลขอเรียก:", (ai.tool_calls ?? []).map((c) => `${c.name}(${JSON.stringify(c.args)})`));
  const [result] = await executeToolCalls([searchCurriculum], ai);
  console.log("\nผลจาก tool (status:", result.status ?? "success", "):\n" + String(result.content).slice(0, 400));

  const direct = await retryAsync(() => model.invoke([{ role: "user", content: "1 + 1 เท่ากับเท่าไร" }]));
  console.log("\nคำถามที่ไม่ต้องค้น → tool_calls:", direct.tool_calls?.length ?? 0, "(โมเดลตอบเองได้)");
});
