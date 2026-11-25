// 18-04: Mock Chat Model
// แนวคิด: ทดสอบ "โค้ดรอบ model" ด้วย model ปลอมที่ตอบตามสคริปต์ — เร็ว ฟรี ไม่สุ่ม และตรวจได้ว่า prompt ที่ส่งไปคืออะไร
import assert from "node:assert/strict";
import { AIMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createScriptedChatModel } from "../../src/utils/scripted-model.js";
import { isMain } from "../../src/utils/is-main.js";

export async function run() {
  const model = createScriptedChatModel([new AIMessage("สรุป: ประชุมเลื่อนเป็นวันพฤหัส"), new AIMessage("ครั้งที่สอง")]);
  const chain = ChatPromptTemplate.fromMessages([
    ["system", "สรุปข้อความให้สั้นที่สุด"],
    ["human", "{text}"],
  ])
    .pipe(model)
    .pipe(new StringOutputParser());

  const out = await chain.invoke({ text: "ทีมขอเลื่อนประชุมจากวันพุธเป็นวันพฤหัส" });
  assert.equal(out, "สรุป: ประชุมเลื่อนเป็นวันพฤหัส");
  console.log("✓ chain คืนคำตอบตามสคริปต์:", out);

  // ตรวจสิ่งที่ "ส่งให้ model" — พิสูจน์ว่า prompt template ประกอบถูก
  const sent = model.seenMessages[0].map((m) => `${m.type}: ${String(m.content)}`);
  assert.deepEqual(sent, ["system: สรุปข้อความให้สั้นที่สุด", "human: ทีมขอเลื่อนประชุมจากวันพุธเป็นวันพฤหัส"]);
  console.log("✓ prompt ที่ส่ง:", sent.join(" | "));

  await chain.invoke({ text: "อีกข้อความ" });
  await assert.rejects(chain.invoke({ text: "เกินสคริปต์" }), /script exhausted/);
  console.log("✓ สคริปต์หมดแล้ว model throw ชัดเจน (กันเทสต์ที่เรียก model เกินที่คาด)");
  return { out, sent, calls: model.calls };
}

if (isMain(import.meta.url)) await run();
