// Workshop 12 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { BaseCheckpointSaver, BaseStore } from "@langchain/langgraph-checkpoint";
import { assertThreadOwner, threadIdFor } from "../../../src/memory/thread-access.js";
import { getPreferences } from "../../../src/memory/preferences.js";

export interface ChatOptions {
  model: BaseChatModel;
  checkpointer: BaseCheckpointSaver;
  store: BaseStore;
  /** ต้องมาจากการพิสูจน์ตัวตน ไม่ใช่จากข้อความผู้ใช้ */
  userId: string;
  conversationId?: string;
  threadId?: string;
  message: string;
}

/** ส่งข้อความ 1 ครั้ง: จำบทสนทนา (checkpointer) + จำผู้ใช้ (store) แยกตาม userId */
export async function chat(o: ChatOptions): Promise<string> {
  // TODO 1: threadId = o.threadId ?? threadIdFor(userId, conversationId) แล้ว assertThreadOwner ก่อนแตะ model/store
  // TODO 2: getPreferences(store, userId) → ใส่ลง system prompt (เฉพาะของผู้ใช้คนนี้)
  // TODO 3: createAgent({ model, tools: [], systemPrompt, checkpointer }) → invoke ด้วย thread_id
  // TODO 4: (ท้าทาย) retry ต้องไม่ส่งข้อความผู้ใช้ซ้ำลง thread
  void [assertThreadOwner, threadIdFor, getPreferences, o];
  throw new Error("TODO: ยังไม่ได้ทำ");
}
