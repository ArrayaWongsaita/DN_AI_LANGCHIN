import { parseArgs } from "node:util";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { BaseCheckpointSaver, BaseStore } from "@langchain/langgraph-checkpoint";
import { createAgent } from "langchain";
import { createChatModel } from "../../../src/models/index.js";
import { assertThreadOwner, threadIdFor } from "../../../src/memory/thread-access.js";
import { deletePreferences, getPreferences, savePreference } from "../../../src/memory/preferences.js";
import { withPostgresMemory } from "../../../src/memory/postgres.js";
import { isMain } from "../../../src/utils/is-main.js";
import { retryAsync } from "../../../src/utils/retry.js";
import { messageText } from "../../../src/utils/text.js";

export interface ChatOptions {
  model: BaseChatModel;
  checkpointer: BaseCheckpointSaver;
  store: BaseStore;
  /** ต้องมาจากการพิสูจน์ตัวตน (ในเวิร์กชอปนี้มาจาก --user) ไม่ใช่จากข้อความของผู้ใช้ */
  userId: string;
  conversationId?: string;
  /** thread id แบบเต็ม (ถ้าระบุ จะตรวจความเป็นเจ้าของก่อนเปิด) */
  threadId?: string;
  message: string;
}

const BASE_PROMPT = "คุณคือผู้ช่วยส่วนตัว ตอบเป็นภาษาไทย กระชับ";

/** ส่งข้อความ 1 ครั้ง: จำบทสนทนา (checkpointer) + จำผู้ใช้ (store) แยกตาม userId */
export async function chat(o: ChatOptions): Promise<string> {
  // 1) สิทธิ์ก่อนเสมอ — ถ้าไม่ใช่เจ้าของ ต้องไม่แตะโมเดลหรือ store
  const threadId = o.threadId ?? threadIdFor(o.userId, o.conversationId ?? "default");
  assertThreadOwner(o.userId, threadId);

  // 2) preference ของ "ผู้เรียกคนนี้เท่านั้น" ใส่ใน system prompt
  const prefs = await getPreferences(o.store, o.userId);
  const lines = Object.entries(prefs).map(([k, v]) => `- ${k}: ${v}`);
  const systemPrompt = lines.length ? `${BASE_PROMPT}\nความต้องการของผู้ใช้:\n${lines.join("\n")}` : BASE_PROMPT;

  const agent = createAgent({ model: o.model, tools: [], systemPrompt, checkpointer: o.checkpointer });
  const config = { configurable: { thread_id: threadId } };
  // retry ต้องไม่ส่งข้อความผู้ใช้ซ้ำ: ถ้ารอบก่อนล้มหลังบันทึกข้อความลง checkpoint แล้ว ให้ทำต่อจาก checkpoint เดิม (input = null)
  const userMessage = { role: "user", content: o.message };
  const alreadySaved = async (): Promise<boolean> => {
    const msgs = ((await o.checkpointer.getTuple(config))?.checkpoint.channel_values.messages ?? []) as { getType(): string; content: unknown }[];
    const last = msgs.at(-1);
    return last?.getType() === "human" && last.content === o.message;
  };
  let first = true;
  const r = await retryAsync(async () => {
    const resume = !first && (await alreadySaved());
    first = false;
    return agent.invoke(resume ? null : { messages: [userMessage] }, config);
  });
  return messageText(r.messages.at(-1)!).trim();
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      user: { type: "string" },
      conversation: { type: "string" },
      thread: { type: "string" },
      pref: { type: "string", multiple: true },
      "show-prefs": { type: "boolean" },
      forget: { type: "boolean" },
      provider: { type: "string" },
    },
  });
  const usage = 'ใช้: personal-assistant.ts --user <id> [--conversation <id> | --thread <id เต็ม>] [--pref key=value] [--show-prefs] [--forget] ["ข้อความ"] [--provider tokenme|groq|deepseek]';
  try {
    if (!values.user) throw new Error(usage);
    const userId = values.user;
    await withPostgresMemory(async ({ checkpointer, store }) => {
      for (const p of values.pref ?? []) {
        const i = p.indexOf("=");
        if (i < 1) throw new Error(`--pref ต้องเป็นรูป key=value (ได้ "${p}")`);
        await savePreference(store, userId, p.slice(0, i), p.slice(i + 1));
        console.log(`บันทึก preference: ${p}`);
      }
      if (values["show-prefs"]) console.log("preferences:", await getPreferences(store, userId));
      if (values.forget) {
        await deletePreferences(store, userId);
        console.log("ลบ preference ของผู้ใช้นี้แล้ว");
      }
      const message = positionals.join(" ").trim();
      if (!message) return;
      const provider = values.provider === "deepseek" || values.provider === "groq" ? values.provider : "tokenme";
      const model = await createChatModel({ provider, maxTokens: 2000, ...(provider === "deepseek" ? { thinking: false } : {}) });
      console.log(await chat({ model, checkpointer, store, userId, conversationId: values.conversation ?? "default", threadId: values.thread, message }));
    });
  } catch (e) {
    console.error("❌", (e as Error).message);
    process.exitCode = 1;
  }
}
