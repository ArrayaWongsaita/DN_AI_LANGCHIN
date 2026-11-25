// 08-02: Read Streaming Chunks
// แนวคิด: stream() คืน async iterator — อ่านด้วย for await...of ได้ AIMessageChunk ทีละชิ้น
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 2000 });

let count = 0;
process.stdout.write("AI: ");
for await (const chunk of await model.stream("นับ 1 ถึง 10 เป็นภาษาไทย คั่นด้วยเครื่องหมายจุลภาค")) {
  count++;
  // chunk.content คือข้อความส่วนใหม่ (ไม่ใช่ข้อความทั้งหมดจนถึงตอนนี้)
  process.stdout.write(messageText(chunk));
  if (count === 1) console.log("\n[ชนิดของ chunk:", chunk.constructor.name + "]");
}
console.log(`\n\nได้ทั้งหมด ${count} chunks`);
