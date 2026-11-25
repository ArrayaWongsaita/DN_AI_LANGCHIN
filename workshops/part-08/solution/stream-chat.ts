// Workshop 08 (ส่วนที่ 1) — เฉลย: Streaming CLI Chatbot
// ใช้: pnpm exec tsx --env-file=.env workshops/part-08/solution/stream-chat.ts
// คำสั่ง: /exit ออก · Ctrl+C ระหว่างตอบ = หยุดคำตอบนั้นแล้วคุยต่อได้ · แสดง TTFT ทุกครั้ง
import { createInterface } from "node:readline";
import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { createChatModel } from "../../../src/models/index.js";
import { messageText } from "../../../src/utils/text.js";

const model = await createChatModel({ maxTokens: 2000 });
const history: BaseMessage[] = [];
const rl = createInterface({ input: process.stdin, output: process.stdout });
let closed = false; // stdin ปิดแล้ว (เช่นรับข้อมูลผ่าน pipe) — เรียก rl.prompt() ต่อไม่ได้
rl.on("close", () => (closed = true));
const prompt = () => !closed && rl.prompt();

let controller: AbortController | undefined;
rl.on("SIGINT", () => {
  if (controller) controller.abort(); // กำลังตอบอยู่ → หยุดเฉพาะคำตอบนี้
  else rl.close(); // ว่างอยู่ → ออก
});

console.log("Streaming chatbot — พิมพ์ /exit เพื่อออก, Ctrl+C เพื่อหยุดคำตอบ");
rl.setPrompt("คุณ: ");
prompt();

// for await บน readline: บรรทัดที่พิมพ์/ส่งเข้ามาระหว่างที่ AI ยังตอบอยู่จะถูกเข้าคิว ไม่หาย (ใช้กับ pipe ได้ด้วย)
for await (const raw of rl) {
  const line = raw.trim();
  if (line === "/exit") break;
  if (!line) {
    prompt();
    continue;
  }

  history.push(new HumanMessage(line));
  controller = new AbortController();
  const start = performance.now();
  let ttft: number | undefined;
  let reply = "";
  process.stdout.write("AI: ");
  try {
    for await (const chunk of await model.stream(history, { signal: controller.signal })) {
      const text = messageText(chunk);
      if (text && ttft === undefined) ttft = Math.round(performance.now() - start);
      reply += text;
      process.stdout.write(text);
    }
    history.push(new AIMessage(reply));
    console.log(`\n[TTFT ${ttft ?? "-"} ms | ทั้งหมด ${Math.round(performance.now() - start)} ms]`);
  } catch (err) {
    if (controller.signal.aborted) {
      // เก็บ partial response ไว้ใน history เพื่อให้บทสนทนาต่อเนื่อง
      if (reply) history.push(new AIMessage(reply));
      console.log("\n[หยุดคำตอบแล้ว]");
    } else {
      history.pop(); // turn ที่ล้มเหลวไม่ควรค้างใน history
      console.log(`\n❌ ${(err as Error).message.slice(0, 100)}`);
    }
  } finally {
    controller = undefined;
  }
  prompt();
}
rl.close();
console.log("ลาก่อน!");
