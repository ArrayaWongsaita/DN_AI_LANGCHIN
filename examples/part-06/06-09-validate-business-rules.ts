// 06-09: Validate Business Rules
// แนวคิด: schema ตรวจ "รูปร่าง" ได้ แต่กฎทางธุรกิจ (ราคา > 0, ไซซ์ไม่ซ้ำ) ต้องตรวจเพิ่ม — ผลจาก AI ต้องไม่ถูกเชื่อทันที
import { z } from "zod";
import { createChatModel } from "../../src/models/index.js";

// วิธีที่ 1: ใส่กฎใน schema ด้วย refine()/min()
const productSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive("ราคาต้องมากกว่า 0"),
  sizes: z.array(z.string()).refine((s) => new Set(s).size === s.length, "ไซซ์ซ้ำกัน"),
});

// วิธีที่ 2: ฟังก์ชันตรวจกฎแยก (ซับซ้อนกว่า/ต้องดูหลายที่) — คืนรายการข้อผิดพลาด
function checkBusinessRules(p: z.infer<typeof productSchema>): string[] {
  const errors: string[] = [];
  if (p.price > 100_000) errors.push("ราคาสูงผิดปกติ (> 100,000) — ให้คนตรวจ");
  if (p.sizes.some((s) => !["XS", "S", "M", "L", "XL"].includes(s))) errors.push("มีไซซ์ที่ระบบไม่รู้จัก");
  return errors;
}

// ข้อมูลตัวอย่างที่ "ผิดกฎ" (จำลองสิ่งที่ AI อาจให้มา) — deterministic
for (const candidate of [
  { name: "เสื้อ", price: 350, sizes: ["M", "L"] },
  { name: "เสื้อ", price: -5, sizes: ["M", "M"] },
  { name: "เสื้อ", price: 350, sizes: ["XXXL"] },
]) {
  const parsed = productSchema.safeParse(candidate);
  if (!parsed.success) {
    console.log("❌ schema:", parsed.error.issues.map((i) => i.message).join(", "));
    continue;
  }
  const errors = checkBusinessRules(parsed.data);
  console.log(errors.length ? `⚠️ business: ${errors.join(", ")}` : "✅ ผ่านทุกกฎ", JSON.stringify(parsed.data));
}

// ของจริง: ผลจาก AI ก็ต้องผ่านด่านเดียวกัน
const model = (await createChatModel({ maxTokens: 2000 })).withStructuredOutput(productSchema);
const fromAI = await model.invoke("ดึงข้อมูลสินค้า: เสื้อสีดำราคา 350 บาท มีไซซ์ M และ L");
console.log("\nจาก AI:", fromAI, "→ business errors:", checkBusinessRules(fromAI));
