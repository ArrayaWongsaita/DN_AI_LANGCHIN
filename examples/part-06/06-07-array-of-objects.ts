// 06-07: Array of Objects
// แนวคิด: ดึงข้อมูล "หลายรายการ" ออกมาเป็น array ของ object
import { z } from "zod";
import { createChatModel } from "../../src/models/index.js";

const schema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().describe("จำนวนชิ้น"),
      unitPrice: z.number().describe("ราคาต่อชิ้น (บาท)"),
    }),
  ),
});

const model = (await createChatModel({ maxTokens: 2000 })).withStructuredOutput(schema);
const { items } = await model.invoke(
  "ดึงรายการสินค้าจากใบสั่งซื้อ: ปากกา 3 ด้าม ด้ามละ 15 บาท, สมุด 2 เล่ม เล่มละ 45 บาท, ยางลบ 1 ก้อน 10 บาท",
);
console.table(items);

// เมื่อได้เป็น array ของ object แล้ว คำนวณต่อด้วยโค้ดปกติ (ไม่ต้องให้ LLM คำนวณ)
const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
console.log("ยอดรวมที่โค้ดคำนวณ:", total, "บาท");
