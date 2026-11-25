import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { FakeListChatModel } from "@langchain/core/utils/testing";

/** โมเดลปลอมที่ตอบข้อความตามลำดับที่กำหนด — ใช้ในการทดสอบและตัวอย่างที่ไม่อยากเสียโควตา API */
export function createMockChatModel(responses: string[]): BaseChatModel {
  return new FakeListChatModel({ responses });
}
