// 06-04: withStructuredOutput()
// แนวคิด: model.withStructuredOutput(schema) → model ที่ตอบเป็น "object ตาม schema" (ผ่านการตรวจแล้ว)
// ความเข้ากันได้ของ provider: TokenMe และ Groq gpt-oss ใช้ได้เลย / DeepSeek ต้องปิด thinking (thinking: false)
import { z } from "zod";
import { createChatModel, type ProviderName } from "../../src/models/index.js";

const productSchema = z.object({
  name: z.string().describe("ชื่อสินค้า ไม่รวมสีและราคา"),
  price: z.number().describe("ราคาเป็นบาท"),
  sizes: z.array(z.string()).describe("ไซซ์ที่มี"),
});
const text = "เสื้อสีดำราคา 350 บาท มีไซซ์ M และ L";

for (const provider of ["tokenme", "groq", "deepseek"] as ProviderName[]) {
  try {
    const model = (await createChatModel({ provider, thinking: false, maxTokens: 2000 })).withStructuredOutput(productSchema);
    const product = await model.invoke(`ดึงข้อมูลสินค้า: ${text}`);
    // product เป็น object จริง และ TypeScript รู้ type ของมัน
    console.log(`[${provider}]`, product, "| typeof price =", typeof product.price);
  } catch (e) {
    console.log(`[${provider}] ข้าม/ล้มเหลว:`, (e as Error).message.slice(0, 100));
  }
}
