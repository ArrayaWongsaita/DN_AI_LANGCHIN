import type { BaseMessage } from "@langchain/core/messages";

/**
 * ดึงข้อความจาก message ไม่ว่า content จะเป็น string หรือ array ของ content blocks
 * (บาง provider/reasoning model ส่ง content เป็น array) — รวมเฉพาะ block ชนิด text
 */
export function messageText(msg: Pick<BaseMessage, "content">): string {
  const { content } = msg;
  if (typeof content === "string") return content;
  return content
    .map((block) =>
      typeof block === "string"
        ? block
        : block.type === "text" && typeof block.text === "string"
          ? block.text
          : "",
    )
    .join("");
}
