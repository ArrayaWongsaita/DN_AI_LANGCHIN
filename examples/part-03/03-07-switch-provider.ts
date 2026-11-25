// 03-07: Switch Provider
// แนวคิด: โค้ดส่วนที่เหลือเหมือนเดิม — เปลี่ยนแค่ provider (TokenMe ↔ Groq ↔ DeepSeek)
import { createChatModel, type ProviderName } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const prompt = "อธิบาย Recursion ให้เด็กอายุ 10 ขวบเข้าใจ ใน 2 ประโยค";
const providers: ProviderName[] = ["tokenme", "groq", "deepseek"];

for (const provider of providers) {
  try {
    const model = await createChatModel({ provider, maxTokens: 1500 });
    const start = performance.now();
    const r = await model.invoke(prompt);
    const ms = Math.round(performance.now() - start);
    console.log(`\n=== ${provider} ===`);
    console.log(`เวลา: ${ms} ms | token: ${JSON.stringify(r.usage_metadata)}`);
    console.log(messageText(r).trim());
  } catch (err) {
    // เช่น ยังไม่ตั้ง key ของ provider นั้น — ข้ามไปตัวถัดไปแทนที่จะล้มทั้งโปรแกรม
    console.log(`\n=== ${provider} === ข้าม: ${(err as Error).message}`);
  }
}
