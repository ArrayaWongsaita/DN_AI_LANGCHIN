import { z } from "zod";

/** Schema ของสินค้าที่ AI ต้องดึงออกมา — .describe() ช่วยให้ model เข้าใจความหมายของแต่ละ field */
export const productSchema = z.object({
  name: z.string().describe("ชื่อสินค้า (ไม่รวมสีและราคา) เช่น เสื้อยืด"),
  price: z.number().describe("ราคาเป็นตัวเลขหน่วยบาท ไม่ใส่สัญลักษณ์"),
  color: z.string().describe("สีของสินค้า"),
  sizes: z
    .array(z.string())
    .describe("ไซซ์ที่ระบุในข้อความเท่านั้น เช่น ['M','L'] ถ้าข้อความไม่ระบุไซซ์ให้เป็น array ว่าง [] ห้ามเดา"),
  category: z
    .enum(["clothing", "electronics", "food", "home", "other"])
    .describe("หมวดหมู่สินค้า"),
});

export type Product = z.infer<typeof productSchema>;

/** กฎทางธุรกิจที่ schema ตรวจไม่ได้ — คืนรายการข้อผิดพลาด (ว่าง = ผ่าน) */
export function validateBusinessRules(product: Product): string[] {
  const errors: string[] = [];
  if (!(product.price > 0)) errors.push("price ต้องมากกว่า 0");
  if (product.category === "clothing" && product.sizes.length === 0) errors.push("เสื้อผ้าต้องมีอย่างน้อย 1 ไซซ์");
  if (product.sizes.some((s) => s.trim() === "")) errors.push("มีไซซ์ที่เป็นค่าว่าง");
  if (new Set(product.sizes).size !== product.sizes.length) errors.push("ไซซ์ซ้ำกัน");
  return errors;
}
