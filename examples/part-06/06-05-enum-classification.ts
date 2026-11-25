// 06-05: Enum Classification
// แนวคิด: z.enum() บังคับให้คำตอบเป็นค่าใดค่าหนึ่งที่กำหนด — เหมาะกับ classification / intent detection
import { z } from "zod";
import { createChatModel } from "../../src/models/index.js";

const schema = z.object({
  intent: z.enum(["order_status", "refund", "product_question", "complaint", "other"]).describe("เจตนาของลูกค้า"),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  confidence: z.number().min(0).max(1).describe("ความมั่นใจ 0-1"),
});

const model = (await createChatModel({ maxTokens: 2000 })).withStructuredOutput(schema);

for (const msg of [
  "สั่งของไปสามวันแล้ว พัสดุยังไม่ถึงเลยครับ",
  "ขอคืนเงินได้ไหม สินค้าชำรุด",
  "รุ่นนี้กันน้ำไหมคะ",
]) {
  console.log(`"${msg}"\n  →`, await model.invoke(`จัดหมวดข้อความลูกค้า: ${msg}`));
}
