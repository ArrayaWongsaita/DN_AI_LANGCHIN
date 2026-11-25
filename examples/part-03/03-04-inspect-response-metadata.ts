// 03-04: Inspect Response Metadata
// แนวคิด: นอกจากคำตอบ AIMessage ยังมี metadata ที่ provider ส่งมา — ใช้ debug/ติดตามได้
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 800 });
const r = await model.invoke("1 + 1 เท่ากับเท่าไร");

console.log("content:", messageText(r));
console.log("id:", r.response_metadata?.id);
console.log("finish_reason:", r.response_metadata?.finish_reason); // stop = จบปกติ, length = ถูกตัดเพราะ maxTokens
console.log("model:", r.response_metadata?.model);
console.log("keys ของ response_metadata:", Object.keys(r.response_metadata ?? {}));
console.log("tool_calls:", r.tool_calls); // ว่างเมื่อ model ไม่ได้ขอเรียก tool (Part 09)
