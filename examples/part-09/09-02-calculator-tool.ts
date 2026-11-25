// 09-02: Create Calculator Tool
// แนวคิด: tool() ห่อฟังก์ชันด้วย name, description และ Zod schema — สามอย่างนี้คือสิ่งที่โมเดลเห็น
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const calculator = tool(
  async ({ a, b, operation }) => {
    if (operation === "divide" && b === 0) return "Error: หารด้วยศูนย์ไม่ได้";
    const result = { add: a + b, subtract: a - b, multiply: a * b, divide: a / b }[operation];
    return String(result);
  },
  {
    name: "calculator",
    description: "คำนวณเลขสองจำนวนด้วยการบวก ลบ คูณ หรือหาร",
    schema: z.object({
      a: z.number().describe("ตัวเลขตัวแรก"),
      b: z.number().describe("ตัวเลขตัวที่สอง"),
      operation: z.enum(["add", "subtract", "multiply", "divide"]).describe("การดำเนินการ"),
    }),
  },
);

console.log("name       :", calculator.name);
console.log("description:", calculator.description);
console.log("schema (JSON Schema ที่ส่งให้โมเดล):");
console.log(JSON.stringify(z.toJSONSchema(calculator.schema), null, 2));
