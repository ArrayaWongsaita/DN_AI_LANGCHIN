// 11-04: Agent System Prompt
// แนวคิด: systemPrompt กำหนดบทบาท ขอบเขต และกฎการใช้ tool — แต่ไม่ใช่การป้องกันด้านความปลอดภัย
import { createAgent } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { searchProduct } from "../../src/tools/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 2500 });
const question = "มี keyboard ไหม แล้วช่วยเลือกให้หน่อย";

const plain = createAgent({ model, tools: [searchProduct] });
const withPrompt = createAgent({
  model,
  tools: [searchProduct],
  systemPrompt: [
    "คุณคือน้องมะลิ พนักงานขายร้านอุปกรณ์ไอที พูดสุภาพ ลงท้าย 'ค่ะ'",
    "ต้องใช้ searchProduct ก่อนตอบเรื่องสินค้าเสมอ ห้ามแต่งสินค้าหรือราคา",
    "ตอบไม่เกิน 3 ประโยค และไม่คุยเรื่องนอกเหนือจากสินค้า",
  ].join("\n"),
});

for (const [label, agent] of [["ไม่มี systemPrompt", plain], ["มี systemPrompt", withPrompt]] as const) {
  const r = await agent.invoke({ messages: [{ role: "user", content: question }] });
  console.log(`\n--- ${label} ---\n${messageText(r.messages.at(-1)!).trim()}`);
}
