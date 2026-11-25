// Workshop 06 — เฉลย: AI Product Extractor
// ใช้: pnpm exec tsx --env-file=.env workshops/part-06/solution/product-extractor.ts "เสื้อสีดำราคา 350 บาท มีไซซ์ M และ L"
import { createChatModel } from "../../../src/models/index.js";
import { productSchema, validateBusinessRules, type Product } from "./product-schema.js";

/** ดึงข้อมูลสินค้าจากข้อความ: structured output → ตรวจกฎธุรกิจ → retry สูงสุด 2 ครั้งโดยบอกข้อผิดพลาด */
export async function extractProduct(text: string, maxAttempts = 3): Promise<Product> {
  const model = (await createChatModel({ maxTokens: 2000, thinking: false })).withStructuredOutput(productSchema);
  let feedback = "";
  let lastErrors: string[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const product = await model.invoke(`ดึงข้อมูลสินค้าจากข้อความ (ห้ามเดาข้อมูลที่ไม่มีในข้อความ):\n<text>\n${text}\n</text>${feedback}`);
      lastErrors = validateBusinessRules(product);
      if (lastErrors.length === 0) return product;
      feedback = `\nคำตอบก่อนหน้าผิดกฎ: ${lastErrors.join(", ")} — แก้ไข`;
    } catch (err) {
      lastErrors = [(err as Error).message.slice(0, 100)];
      feedback = `\nคำตอบก่อนหน้าไม่ถูกต้อง (${lastErrors[0]}) — ตอบใหม่ให้ตรง schema`;
    }
  }
  throw new Error(`ดึงข้อมูลสินค้าไม่สำเร็จ: ${lastErrors.join("; ")}`);
}

// รันเป็นสคริปต์เมื่อถูกเรียกตรงๆ (ไม่รันเมื่อถูก import)
if (import.meta.url === `file://${process.argv[1]}`) {
  const text = process.argv[2];
  if (!text) {
    console.log('วิธีใช้: product-extractor.ts "เสื้อสีดำราคา 350 บาท มีไซซ์ M และ L"');
    process.exit(1);
  }
  console.log(await extractProduct(text));
}
