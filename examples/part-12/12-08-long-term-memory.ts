// 12-08: Long-term Memory across threads
// แนวคิด: preference อยู่ใน store (PostgresStore) → thread ใหม่ก็รู้จักผู้ใช้; ประวัติแชตอยู่ใน checkpointer แยกกัน
import { createAgent } from "langchain";
import { createChatModel } from "../../src/models/index.js";
import { withPostgresMemory } from "../../src/memory/postgres.js";
import { deletePreferences, getPreferences, savePreference } from "../../src/memory/preferences.js";
import { messageText } from "../../src/utils/text.js";

const userId = "demo-user-12-08";
await withPostgresMemory(async ({ checkpointer, store }) => {
  await savePreference(store, userId, "ภาษาและโทน", "ตอบเป็นภาษาไทย ลงท้ายด้วย 'ค่ะ' เสมอ");
  const model = await createChatModel({ maxTokens: 1500 });

  // ทุกบทสนทนาใหม่: อ่าน preference แล้วใส่ใน system prompt (ไม่ใส่ข้อมูลของผู้ใช้อื่น)
  const askInNewThread = async (conversation: string, q: string) => {
    const prefs = await getPreferences(store, userId);
    const systemPrompt = `ตอบสั้นๆ 1 ประโยค\nความต้องการของผู้ใช้:\n${Object.entries(prefs).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`;
    const agent = createAgent({ model, tools: [], systemPrompt, checkpointer });
    const r = await agent.invoke({ messages: [{ role: "user", content: q }] }, { configurable: { thread_id: `user:${userId}:conv:${conversation}` } });
    console.log(`[${conversation}] > ${q}\n   ${messageText(r.messages.at(-1)!).trim()}`);
  };

  await askInNewThread(`a-${Date.now()}`, "แนะนำวิธีจัดโต๊ะทำงานหน่อย");
  await askInNewThread(`b-${Date.now()}`, "แนะนำอาหารเช้าหน่อย"); // thread ใหม่ — preference ยังอยู่

  await deletePreferences(store, userId); // เก็บกวาด (retention)
  console.log("\nลบ preference ของ", userId, "แล้ว:", await getPreferences(store, userId));
});
