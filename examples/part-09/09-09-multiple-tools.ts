// 09-09: Multiple Tools
// แนวคิด: ให้หลาย tool — โมเดลเลือกจาก "description" ที่เราเขียน จึงต้องเขียนให้ชัดและต่างกัน
import { createChatModel } from "../../src/models/index.js";
import { workshopTools } from "../../src/tools/index.js";

const model = (await createChatModel({ maxTokens: 1500 })).bindTools!(workshopTools);

for (const q of ["อากาศที่เชียงใหม่เป็นอย่างไร", "มี keyboard ขายไหม ราคาเท่าไร", "วันนี้วันที่เท่าไร", "7 + 8 เท่ากับเท่าไร"]) {
  const ai = await model.invoke(q);
  const chosen = ai.tool_calls?.map((c) => `${c.name}(${JSON.stringify(c.args)})`).join(", ") || "(ไม่เรียก tool)";
  console.log(`${q}\n  → ${chosen}`);
}
