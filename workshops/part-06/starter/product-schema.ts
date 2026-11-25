// Workshop 06 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
import { z } from "zod";

// TODO 1: กำหนด field: name, price(number), color, sizes(string[]), category(enum: clothing|electronics|food|home|other)
//         ใส่ .describe() ให้ทุก field — โดยเฉพาะ sizes ต้องบอกว่า "ไม่ระบุ = [] ห้ามเดา"
export const productSchema = z.object({});

export type Product = z.infer<typeof productSchema> & { price: number; category: string; sizes: string[] };

/** กฎที่ schema ตรวจไม่ได้ — คืนรายการข้อผิดพลาด (ว่าง = ผ่าน) */
export function validateBusinessRules(product: Product): string[] {
  // TODO 2: price > 0 · เสื้อผ้า (clothing) ต้องมีอย่างน้อย 1 ไซซ์ · ไซซ์ห้ามว่างหรือซ้ำ
  void product;
  return [];
}
