// 06-08: Optional Fields
// แนวคิด: ข้อมูลบางอย่างอาจไม่มีในข้อความ — ใช้ optional()/nullable() ไม่ให้ model "แต่งค่า" ขึ้นมา
import { z } from "zod";
import { createChatModel } from "../../src/models/index.js";

const schema = z.object({
  name: z.string(),
  price: z.number(),
  // nullable: ถ้าไม่มีข้อมูลในข้อความ ให้ตอบ null (ชัดเจนกว่าการเดา)
  discountPercent: z.number().nullable().describe("เปอร์เซ็นต์ส่วนลด ถ้าไม่ระบุในข้อความให้เป็น null ห้ามเดา"),
  color: z.string().nullable().describe("สี ถ้าไม่ระบุให้เป็น null"),
});

const model = (await createChatModel({ maxTokens: 2000 })).withStructuredOutput(schema);
for (const text of ["หมวกแก๊ปสีแดง 199 บาท ลด 10%", "ที่ชาร์จมือถือ 250 บาท"]) {
  console.log(`"${text}"\n  →`, await model.invoke(`ดึงข้อมูลสินค้า: ${text}`));
}
// สังเกต: ข้อความที่สองไม่มีส่วนลดและสี → ควรได้ null ไม่ใช่ค่าที่แต่งขึ้น
