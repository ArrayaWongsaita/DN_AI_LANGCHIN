// 09-04: Bind Tool to Model
// แนวคิด: model.bindTools([...]) บอกโมเดลว่ามี tool อะไรให้ใช้ — โมเดล "ไม่ได้รัน tool" แค่ตัดสินใจว่าจะขอเรียกหรือไม่
import { createChatModel } from "../../src/models/index.js";
import { calculator } from "./_calculator.js";

const model = await createChatModel({ maxTokens: 1500 });
const withTools = model.bindTools!([calculator]);

const result = await withTools.invoke("1234 คูณ 5678 เท่ากับเท่าไร");
console.log("content:", JSON.stringify(result.content));
console.log("tool_calls:", JSON.stringify(result.tool_calls, null, 2));
console.log("→ โมเดลไม่ได้ตอบเลขเอง แต่ขอให้เราเรียก calculator (ยังไม่มีใครรัน tool)");
