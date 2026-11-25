// 12-10: Summarize Old Messages
// แนวคิด: แทนที่จะทิ้งประวัติเก่า ให้ "สรุป" เป็นข้อความเดียวแล้วเก็บสรุปไว้ (ลด token แต่ยังไม่ลืมสาระ)
import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { messageText } from "../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 1500 });
const history: BaseMessage[] = [
  new HumanMessage("ฉันชื่อมะลิ ทำงานเป็นนักบัญชี"),
  new AIMessage("ยินดีที่ได้รู้จักค่ะ คุณมะลิ"),
  new HumanMessage("ฉันกำลังวางแผนไปเที่ยวเชียงใหม่ 3 วัน งบ 8,000 บาท"),
  new AIMessage("ได้เลยค่ะ ต้องการเน้นธรรมชาติหรือคาเฟ่คะ"),
  new HumanMessage("เน้นคาเฟ่ และฉันแพ้ถั่ว"),
  new AIMessage("รับทราบค่ะ จะเลี่ยงเมนูที่มีถั่ว"),
  new HumanMessage("ช่วยแนะนำคาเฟ่วันแรกหน่อย"),
];

const KEEP_LAST = 2; // เก็บข้อความล่าสุดไว้ครบ
const old = history.slice(0, -KEEP_LAST);
const recent = history.slice(-KEEP_LAST);

const summary = await model.invoke([
  new SystemMessage("สรุปบทสนทนาต่อไปนี้เป็นภาษาไทย ไม่เกิน 3 บรรทัด เก็บข้อเท็จจริงสำคัญของผู้ใช้ (ชื่อ อาชีพ แผน งบ ข้อจำกัด)"),
  new HumanMessage(old.map((m) => `${m.getType()}: ${messageText(m)}`).join("\n")),
]);
const summaryText = messageText(summary).trim();
console.log("สรุปของ", old.length, "ข้อความเก่า:\n" + summaryText);

const compact = [new SystemMessage(`สรุปบทสนทนาก่อนหน้า:\n${summaryText}`), ...recent];
console.log(`\nก่อน: ${history.length} ข้อความ → หลัง: ${compact.length} ข้อความ`);
const r = await model.invoke(compact);
console.log("\nตอบจากประวัติที่สรุปแล้ว:", messageText(r).trim().slice(0, 300));
