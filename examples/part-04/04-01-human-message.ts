// 04-01: HumanMessage
// แนวคิด: ข้อความของผู้ใช้ห่อด้วย HumanMessage (role = "human") — ส่งเป็น array ให้ model
import { HumanMessage } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const msg = new HumanMessage("ช่วยบอกวิธีทำไข่เจียว 3 ขั้นตอน ขั้นตอนละ 1 บรรทัด");
console.log("type:", msg.type); // role ของข้อความ
console.log("content:", msg.content);

const model = await createChatModel({ maxTokens: 1500 });
const response = await model.invoke([msg]); // ส่งเป็น array ของ messages
console.log("\nAI:", messageText(response));

// Multimodal เบื้องต้น: content เป็น array ของ blocks ได้ (ข้อความ + รูป) — ที่นี่แค่ดูโครงสร้าง ไม่ได้ส่งจริง
// (ต้องใช้ model ที่รองรับรูป)
const multimodal = new HumanMessage({
  content: [
    { type: "text", text: "รูปนี้คืออะไร" },
    { type: "image_url", image_url: { url: "https://example.com/cat.png" } },
  ],
});
console.log("\nโครงสร้าง multimodal content:", JSON.stringify(multimodal.content));
