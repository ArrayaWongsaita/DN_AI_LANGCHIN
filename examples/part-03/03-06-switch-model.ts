// 03-06: Switch Model
// แนวคิด: เปลี่ยน model ใน provider เดียวกัน = เปลี่ยนแค่ชื่อ — เปรียบเทียบเวลาและ token
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const prompt = "อธิบาย Recursion ให้เด็กอายุ 10 ขวบเข้าใจ ใน 2 ประโยค";
const models = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"];

for (const name of models) {
  const model = await createChatModel({ model: name, maxTokens: 1500 });
  const start = performance.now();
  const r = await model.invoke(prompt);
  const ms = Math.round(performance.now() - start);
  console.log(`\n=== ${name} ===`);
  console.log(`เวลา: ${ms} ms | token: ${JSON.stringify(r.usage_metadata)}`);
  console.log(messageText(r).trim());
}
