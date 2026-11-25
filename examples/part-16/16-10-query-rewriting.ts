// 16-10: Query Rewriting
// ปัญหา: คำถามต่อเนื่อง ("แล้วต้องจ่ายเมื่อไร") ไม่มีบริบทในตัวเอง → retriever ค้นไม่เจอ
// ทางแก้: ให้โมเดลเขียนคำถามใหม่ให้ "ครบในตัวเอง" (standalone) จากประวัติสนทนา ก่อนค้น
import { createChatModel } from "../../src/models/index.js";
import { retryAsync } from "../../src/utils/retry.js";
import { messageText } from "../../src/utils/text.js";
import { snippet, withKnowledgeBase } from "./_kb.js";

const model = await createChatModel({ maxTokens: 500 });
const history = ["ชั้นเรียนเสริมคณิตศาสตร์เปิดสอนที่ไหน", "ที่ห้อง 204 ครับ"];
const followUp = "แล้วเปิดวันไหนบ้าง";

async function rewrite(): Promise<string> {
  const r = await retryAsync(() =>
    model.invoke([
      { role: "system", content: "เขียนคำถามล่าสุดใหม่ให้ครบในตัวเอง ไม่ต้องพึ่งบริบทก่อนหน้า โดยคงชื่อเฉพาะ/หัวข้อจากประวัติไว้ (เช่นชื่อวิชา ชื่อกิจกรรม) ตอบเฉพาะคำถามที่เขียนใหม่ บรรทัดเดียว" },
      { role: "user", content: `ประวัติ:\n${history.join("\n")}\n\nคำถามล่าสุด: ${followUp}` },
    ]),
  );
  return messageText(r).trim();
}

await withKnowledgeBase(async ({ retriever }) => {
  const standalone = await rewrite();
  console.log(`คำถามต่อเนื่อง : ${followUp}\nเขียนใหม่       : ${standalone}\n`);
  for (const [label, q] of [["ก่อนเขียนใหม่", followUp], ["หลังเขียนใหม่", standalone]] as const) {
    const docs = await retriever.invoke(q);
    console.log(`${label}: ${docs.length} ชิ้น →`, docs.length ? snippet(docs[0], 60) : "(ไม่พบ)");
  }
});
