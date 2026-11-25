// Workshop 05 — เฉลย: AI Translator (CLI)
// ใช้: pnpm exec tsx --env-file=.env workshops/part-05/solution/translator.ts <ภาษาต้นทาง> <ภาษาเป้าหมาย> <ระดับสุภาพ> <รูปแบบ> "<ข้อความ>"
import { createChatModel } from "../../../src/models/index.js";
import { messageText } from "../../../src/utils/text.js";
import { translatorPrompt } from "./translator-prompt.js";

const [source_language, target_language, politeness, style, text] = process.argv.slice(2);
if (!text) {
  console.log('วิธีใช้: translator.ts <ต้นทาง> <เป้าหมาย> <ระดับสุภาพ> <รูปแบบ> "<ข้อความ>"');
  console.log('ตัวอย่าง: translator.ts ไทย อังกฤษ สุภาพมาก แปลตรงตัว "ขอบคุณมากครับ"');
  process.exit(1);
}

const model = await createChatModel({ temperature: 0, maxTokens: 1500 });
const reply = await model.invoke(
  await translatorPrompt.invoke({ source_language, target_language, politeness, style, text }),
);
console.log(messageText(reply).trim());
