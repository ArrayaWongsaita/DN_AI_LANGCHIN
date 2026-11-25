// 06-01: Unstructured Response
// แนวคิด: ปกติ model ตอบเป็น "ข้อความอิสระ" — มนุษย์อ่านได้ แต่โปรแกรมเอาไปใช้ต่อยาก
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 1500 });
const text = "เสื้อสีดำราคา 350 บาท มีไซซ์ M และ L";

const answer = messageText(await model.invoke(`สรุปข้อมูลสินค้าต่อไปนี้: ${text}`)).trim();
console.log("คำตอบ:\n" + answer);

// เราอยากได้ราคาเป็นตัวเลขไปคำนวณ — ต้องเดาวิธีดึงจากข้อความ (เปราะบาง!)
const guess = answer.match(/(\d+)\s*บาท/);
console.log("\nดึงราคาด้วย regex:", guess ? Number(guess[1]) : "ไม่เจอ");
console.log("→ ถ้า model เปลี่ยนรูปแบบคำตอบ (เช่น เขียน 'ราคา: ฿350') regex นี้พังทันที");
