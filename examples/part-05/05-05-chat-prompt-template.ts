// 05-05: ChatPromptTemplate
// แนวคิด: ChatPromptTemplate ประกอบหลาย message (system/human/ai) ที่มีตัวแปรได้ → ได้ array ของ messages
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "คุณเป็นเชฟมืออาชีพ ตอบเป็นภาษาไทย สไตล์{style}"],
  ["human", "ขอสูตร {dish} แบบสั้นๆ ไม่เกิน 3 ขั้นตอน รวมไม่เกิน 5 บรรทัด"],
]);

const promptValue = await prompt.invoke({ style: "เป็นกันเอง", dish: "ไข่ตุ๋น" });
console.log("ได้ messages:");
for (const m of promptValue.toChatMessages()) console.log(`  [${m.type}] ${m.content}`);

const model = await createChatModel({ maxTokens: 1500 });
console.log("\nคำตอบ:", messageText(await model.invoke(promptValue)).trim());
