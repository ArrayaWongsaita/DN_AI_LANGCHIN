// 03-02: Compare Temperature
// แนวคิด: temperature ต่ำ = คำตอบคล้ายเดิมทุกครั้ง, สูง = หลากหลายขึ้น
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const prompt = "ตั้งชื่อร้านกาแฟ 1 ชื่อ ตอบแค่ชื่อเดียว";

for (const temperature of [0, 1.5]) {
  const model = await createChatModel({ temperature, maxTokens: 500 });
  console.log(`\n--- temperature = ${temperature} ---`);
  for (let i = 1; i <= 3; i++) {
    const r = await model.invoke(prompt);
    console.log(`รอบ ${i}:`, messageText(r).trim());
  }
}
// หมายเหตุ: temperature 0 ไม่รับประกันว่าผลเหมือนกันเป๊ะทุก provider/model (non-deterministic ในระดับระบบ)
