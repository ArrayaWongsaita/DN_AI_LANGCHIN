// Workshop 06 — เฉลย: AI Product Extractor
// ใช้: pnpm exec tsx --env-file=.env workshops/part-06/solution/product-extractor.ts "เสื้อสีดำราคา 350 บาท มีไซซ์ M และ L" [groq|deepseek]
import { isMain } from "../../../src/utils/is-main.js";
import { createChatModel, type ProviderName } from "../../../src/models/index.js";
import { productSchema, validateBusinessRules, type Product } from "./product-schema.js";

/** ดึงข้อมูลสินค้าจากข้อความ: structured output → ตรวจกฎธุรกิจ → retry สูงสุด 2 ครั้งโดยบอกข้อผิดพลาด */
export async function extractProduct(text: string, opts: { maxAttempts?: number; provider?: ProviderName } = {}): Promise<Product> {
  const { maxAttempts = 3, provider } = opts;
  const model = (await createChatModel({ provider, maxTokens: 2000, thinking: false })).withStructuredOutput(productSchema);
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
if (isMain(import.meta.url)) {
  // วิธีใช้: product-extractor.ts "<ข้อความ>" [groq|deepseek]
  const [text, provider] = process.argv.slice(2);
  if (!text || (provider && provider !== "groq" && provider !== "deepseek")) {
    console.log('วิธีใช้: product-extractor.ts "เสื้อสีดำราคา 350 บาท มีไซซ์ M และ L" [groq|deepseek]');
    process.exit(1);
  }
  try {
    console.log(await extractProduct(text, { provider: provider as ProviderName | undefined }));
  } catch (err) {
    console.error(`❌ ${(err as Error).message}`);
    process.exit(1);
  }
}
