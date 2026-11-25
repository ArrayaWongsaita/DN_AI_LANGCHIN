// 09-03: Execute Tool Directly
// แนวคิด: tool.invoke(args) เรียกได้ตรงๆ โดยไม่ต้องมี LLM — ใช้ทดสอบ tool ได้ง่าย; args ที่ผิด schema จะถูกปฏิเสธ
import { calculator } from "./_calculator.js";

console.log("7 × 6 =", await calculator.invoke({ a: 7, b: 6, operation: "multiply" }));
console.log("10 ÷ 0 =", await calculator.invoke({ a: 10, b: 0, operation: "divide" }));

try {
  await calculator.invoke({ a: "เจ็ด", b: 6, operation: "multiply" } as never);
} catch (e) {
  console.log("args ผิดชนิด → ถูกปฏิเสธโดย schema:", (e as Error).message.split("\n")[0].slice(0, 90));
}
try {
  await calculator.invoke({ a: 1, b: 2, operation: "power" } as never);
} catch (e) {
  console.log("operation ที่ไม่มีใน enum → ถูกปฏิเสธ:", (e as Error).message.split("\n")[0].slice(0, 90));
}
