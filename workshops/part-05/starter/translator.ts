// Workshop 05 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
// รัน: pnpm exec tsx --env-file=.env workshops/part-05/starter/translator.ts ไทย อังกฤษ สุภาพมาก แปลตรงตัว "ขอบคุณครับ"
import { createChatModel } from "../../../src/models/index.js";
import { messageText } from "../../../src/utils/text.js";
import { translatorPrompt } from "./translator-prompt.js";

const [source_language, target_language, politeness, style, text] = process.argv.slice(2);
// TODO 1: ถ้า argument ไม่ครบ ให้แสดงวิธีใช้พร้อมตัวอย่างแล้ว process.exit(1)
// TODO 2: createChatModel({ temperature: 0 }) → translatorPrompt.invoke({...}) → model.invoke → แสดง messageText
void [createChatModel, messageText, translatorPrompt, source_language, target_language, politeness, style, text];
