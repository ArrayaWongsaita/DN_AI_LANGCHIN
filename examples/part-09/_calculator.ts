// ตัวช่วยของ examples/part-09 (ไม่ใช่ตัวอย่างที่รันเดี่ยว): calculator tool ตัวเดียวกับ 09-02
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const calculator = tool(
  async ({ a, b, operation }) => {
    if (operation === "divide" && b === 0) return "Error: หารด้วยศูนย์ไม่ได้";
    return String({ add: a + b, subtract: a - b, multiply: a * b, divide: a / b }[operation]);
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
