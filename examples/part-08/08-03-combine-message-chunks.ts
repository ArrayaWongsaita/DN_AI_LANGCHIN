// 08-03: Combine Message Chunks
// แนวคิด: AIMessageChunk รวมกันด้วย concat() ได้ — ใช้สร้างข้อความเต็มพร้อม metadata (เช่น token usage) หลังสตรีมจบ
import type { AIMessageChunk } from "@langchain/core/messages";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 2000 });

let full: AIMessageChunk | undefined;
for await (const chunk of await model.stream("ผลไม้ไทย 3 ชนิด ตอบสั้นๆ")) {
  full = full ? full.concat(chunk) : chunk; // สะสมทีละชิ้น
}

console.log("ข้อความรวม:", messageText(full!).trim());
// @langchain/groq 1.3.2 ใส่ usage ไว้ใน response_metadata.usage (usage_metadata อาจเป็น undefined) — ตรวจจริงก่อนใช้
console.log("usage_metadata:", full!.usage_metadata);
console.log("response_metadata.usage:", full!.response_metadata?.usage);
console.log("finish_reason:", full!.response_metadata?.finish_reason);
// ใช้ full เป็น AIMessage ต่อได้ เช่น เก็บเข้า history ของแชต
