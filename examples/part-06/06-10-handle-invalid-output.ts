// 06-10: Handle Invalid Output
// แนวคิด: output ผิดรูปแบบเกิดได้เสมอ — ต้องมีกลยุทธ์ retry พร้อมบอก model ว่าผิดตรงไหน
// ส่วน (ก) ใช้ mock model ที่ "ตอบผิดสองครั้งแล้วตอบถูก" เพื่อให้เห็นกลไก retry ได้แน่นอนและไม่เสียโควตา
import { z } from "zod";
import { createChatModel } from "../../src/models/index.js";
import { createMockChatModel } from "../../src/utils/mock-model.js";
import { messageText } from "../../src/utils/text.js";

const schema = z.object({ name: z.string(), price: z.number() });
type Product = z.infer<typeof schema>;

/** เรียก model → ตรวจด้วย schema → ถ้าผิดส่ง "ข้อความ error" กลับไปให้แก้ (สูงสุด maxAttempts ครั้ง) */
async function extractWithRetry(
  model: { invoke: (input: string) => Promise<{ content: unknown }> },
  prompt: string,
  maxAttempts = 3,
): Promise<Product> {
  let feedback = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = messageText((await model.invoke(prompt + feedback)) as never);
    try {
      const result = schema.safeParse(JSON.parse(raw));
      if (result.success) {
        console.log(`  ครั้งที่ ${attempt}: ✅`);
        return result.data;
      }
      feedback = `\n\nคำตอบก่อนหน้าไม่ถูกต้อง: ${result.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")} — ตอบ JSON ใหม่`;
      console.log(`  ครั้งที่ ${attempt}: ❌ schema → ${feedback.slice(0, 80).trim()}`);
    } catch {
      feedback = "\n\nคำตอบก่อนหน้าไม่ใช่ JSON ที่ถูกต้อง — ตอบเป็น JSON ล้วนๆ";
      console.log(`  ครั้งที่ ${attempt}: ❌ ไม่ใช่ JSON`);
    }
  }
  throw new Error(`ได้ output ที่ถูกต้องไม่สำเร็จหลัง ${maxAttempts} ครั้ง`);
}

console.log("(ก) mock model: ผิด → ผิด → ถูก");
const flaky = createMockChatModel(['{"name": "เสื้อ", "price":', '{"name": "เสื้อ", "price": "350"}', '{"name": "เสื้อ", "price": 350}']);
console.log("  ผลลัพธ์:", await extractWithRetry(flaky as never, "ดึงข้อมูลสินค้า"));

console.log("\n(ข) ถ้าลองครบแล้วยังไม่ผ่าน ต้อง throw ให้ผู้เรียกรู้");
const alwaysBad = createMockChatModel(["not json", "not json"]);
try {
  await extractWithRetry(alwaysBad as never, "ดึงข้อมูลสินค้า", 2);
} catch (e) {
  console.log("  ❌", (e as Error).message);
}

console.log("\n(ค) ของจริง: withStructuredOutput + try/catch + retry");
const real = (await createChatModel({ maxTokens: 2000 })).withStructuredOutput(schema);
for (let attempt = 1; attempt <= 2; attempt++) {
  try {
    console.log("  ผลลัพธ์:", await real.invoke("ดึงข้อมูลสินค้า: เสื้อสีดำราคา 350 บาท"));
    break;
  } catch (e) {
    console.log(`  ครั้งที่ ${attempt} ล้มเหลว:`, (e as Error).message.slice(0, 80));
  }
}
