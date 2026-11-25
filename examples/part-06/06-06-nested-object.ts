// 06-06: Nested Object
// แนวคิด: object ซ้อน object — ใช้ describe() ที่ field ซ้อนในได้เหมือนกัน
import { z } from "zod";
import { createChatModel } from "../../src/models/index.js";

const orderSchema = z.object({
  customer: z.object({
    name: z.string(),
    phone: z.string().describe("เบอร์โทร เก็บเป็น string เพื่อรักษาเลข 0 นำหน้า"),
  }),
  address: z.object({
    street: z.string(),
    district: z.string().describe("เขต/อำเภอ"),
    province: z.string(),
    postalCode: z.string(),
  }),
  total: z.number().describe("ยอดรวมเป็นบาท"),
});

const model = (await createChatModel({ maxTokens: 2000 })).withStructuredOutput(orderSchema);
const order = await model.invoke(
  "ดึงข้อมูลออเดอร์: คุณสมศรี ใจดี โทร 081-234-5678 ส่งที่ 99/1 ถนนสุขุมวิท เขตวัฒนา กรุงเทพฯ 10110 ยอดรวม 1,250 บาท",
);
console.log(JSON.stringify(order, null, 2));
console.log("\nเข้าถึงข้อมูลซ้อนได้แบบ type-safe:", order.address.province, "|", order.customer.phone);
