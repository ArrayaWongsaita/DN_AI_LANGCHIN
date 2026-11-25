// 05-06: Few-shot Prompt
// แนวคิด: ให้ตัวอย่าง input→output สอน model ว่าต้องการรูปแบบไหน (ดีกว่าอธิบายด้วยคำพูดยาวๆ)
import { ChatPromptTemplate, FewShotChatMessagePromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const examples = [
  { input: "ฝนตกหนักมาก ถนนน้ำท่วมเลย", output: "negative" },
  { input: "อาหารอร่อย พนักงานน่ารัก", output: "positive" },
  { input: "ร้านเปิดสิบโมงปิดสองทุ่ม", output: "neutral" },
];

// แต่ละตัวอย่างถูกแปลงเป็นคู่ human/ai
const fewShot = new FewShotChatMessagePromptTemplate({
  examplePrompt: ChatPromptTemplate.fromMessages([
    ["human", "{input}"],
    ["ai", "{output}"],
  ]),
  examples,
  inputVariables: [],
});

// formatMessages() แปลงตัวอย่างเป็น array ของ messages แล้วเสียบผ่าน MessagesPlaceholder
const exampleMessages = await fewShot.formatMessages({});
console.log("ตัวอย่างที่สอนให้ model:", exampleMessages.map((m) => `${m.type}:${m.content}`).join(" | "));

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "จัดหมวดความรู้สึกของข้อความเป็น positive, negative หรือ neutral ตอบคำเดียว"],
  new MessagesPlaceholder("examples"),
  ["human", "{input}"],
]);

const model = await createChatModel({ maxTokens: 800 });
for (const text of ["บริการแย่มาก รอนานเกินไป", "ชอบมาก จะกลับมาอีกแน่นอน", "โต๊ะว่างอยู่ชั้นสอง"]) {
  const r = await model.invoke(await prompt.invoke({ examples: exampleMessages, input: text }));
  console.log(`"${text}" →`, messageText(r).trim());
}
