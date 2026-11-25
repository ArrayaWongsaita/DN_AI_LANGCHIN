// 06-03: Basic Zod Schema
// แนวคิด: Zod = นิยาม "รูปร่างข้อมูล" ที่ตรวจตอนรันจริง (runtime) และให้ TypeScript type ด้วย (z.infer)
// ตัวอย่างนี้ไม่เรียก LLM — ทำความรู้จัก Zod ก่อน
import { z } from "zod";

const productSchema = z.object({
  name: z.string().describe("ชื่อสินค้า"),
  price: z.number().describe("ราคาเป็นบาท"),
  inStock: z.boolean(),
  tags: z.array(z.string()),
  category: z.enum(["clothing", "food", "other"]),
  note: z.string().optional(), // ไม่มีก็ได้ (undefined)
  discount: z.number().nullable(), // ต้องส่งมา แต่เป็น null ได้
});

// z.infer: ได้ TypeScript type จาก schema — ไม่ต้องเขียน type ซ้ำ
type Product = z.infer<typeof productSchema>;

const good: Product = { name: "เสื้อ", price: 350, inStock: true, tags: ["ใหม่"], category: "clothing", discount: null };
console.log("parse() ผ่าน:", productSchema.parse(good));

// safeParse(): ไม่ throw — คืน { success, data | error } (เหมาะกับข้อมูลที่ไม่น่าไว้ใจ เช่นผลจาก AI)
const bad = { ...good, price: "350", category: "weapon" };
const result = productSchema.safeParse(bad);
console.log("\nsafeParse().success:", result.success);
if (!result.success) {
  for (const issue of result.error.issues) console.log(`  - ${issue.path.join(".")}: ${issue.message}`);
}

// parse() กับข้อมูลผิด จะ throw
try {
  productSchema.parse(bad);
} catch (e) {
  console.log("\nparse() throw:", (e as Error).name);
}

// Compile-time vs Runtime: TypeScript type หายไปตอนรัน (เป็นแค่คำอธิบายให้ editor) แต่ Zod schema ยังอยู่และตรวจจริง
