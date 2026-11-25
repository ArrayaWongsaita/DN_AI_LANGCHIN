// 05-04: Multiple Variables
// แนวคิด: หลายตัวแปรใน template เดียว — ต้องส่งครบทุกตัว ไม่งั้น error ชัดเจน
import { PromptTemplate } from "@langchain/core/prompts";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const template = PromptTemplate.fromTemplate(
  "เขียนคำอวยพร{occasion}ถึง{recipient} ความยาว {length} ประโยค โทน{tone}",
);
console.log("ตัวแปร:", template.inputVariables);

const model = await createChatModel({ maxTokens: 1500 });
const prompt = await template.invoke({
  occasion: "วันเกิด",
  recipient: "คุณแม่",
  length: 2,
  tone: "อบอุ่น",
});
console.log("Prompt:", prompt.toString());
console.log("\nคำตอบ:", messageText(await model.invoke(prompt)).trim());

// ลืมส่งตัวแปร → error ที่บอกว่าขาดอะไร (ดีกว่าต่อ string แล้วได้คำว่า "undefined")
try {
  await template.invoke({ occasion: "วันเกิด" } as never);
} catch (err) {
  console.log("\nส่งไม่ครบ →", (err as Error).message.split("\n")[0]);
}
