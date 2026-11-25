// Workshop 06 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
// รัน: เรียกจากโค้ดของคุณเอง หรือเพิ่ม CLI ท้ายไฟล์แล้วรัน pnpm exec tsx --env-file=.env workshops/part-06/starter/product-extractor.ts
import { createChatModel, type ProviderName } from "../../../src/models/index.js";
import { productSchema, validateBusinessRules, type Product } from "./product-schema.js";

/** ดึงข้อมูลสินค้าจากข้อความ: structured output → ตรวจกฎธุรกิจ → retry (บอกข้อผิดพลาดเดิมให้ model แก้) */
export async function extractProduct(text: string, opts: { maxAttempts?: number; provider?: ProviderName } = {}): Promise<Product> {
  // TODO: createChatModel(...).withStructuredOutput(productSchema) → วน maxAttempts รอบ
  //       ถ้า validateBusinessRules ไม่ว่าง หรือ invoke โยน error → ต่อท้าย prompt ว่าผิดตรงไหนแล้วลองใหม่
  //       ครบรอบแล้วยังไม่ผ่านให้ throw พร้อมเหตุผล
  void [createChatModel, productSchema, validateBusinessRules, text, opts];
  throw new Error("TODO: ยังไม่ได้ทำ");
}
