// 05-03: Single Variable
// แนวคิด: แม่แบบเดียว ใช้ซ้ำกับข้อมูลหลายค่า — เปลี่ยนแค่ตัวแปร
import { PromptTemplate } from "@langchain/core/prompts";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const template = PromptTemplate.fromTemplate("ตั้งชื่อร้านขาย{product} 1 ชื่อ ตอบแค่ชื่อ");
const model = await createChatModel({ maxTokens: 800 });

for (const product of ["ขนมไทย", "หนังสือมือสอง", "กระถางต้นไม้"]) {
  const prompt = await template.invoke({ product });
  console.log(`${product} →`, messageText(await model.invoke(prompt)).trim());
}

// ถ้าต้องการเครื่องหมาย { } จริงๆ ใน template ให้พิมพ์ซ้ำสองครั้ง: {{ }}
const withBraces = PromptTemplate.fromTemplate('ตอบเป็น JSON เช่น {{"name": "..."}} สำหรับ {product}');
console.log("\nมีปีกกาจริง:", await withBraces.format({ product: "ขนมไทย" }));
