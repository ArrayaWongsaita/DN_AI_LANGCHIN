/** ส่วนของ id ต้องไม่ว่าง ไม่เป็นช่องว่างล้วน และไม่มี ":" (กัน id ปลอมที่แทรก namespace) */
function assertPart(label: string, value: string): void {
  if (!value || !value.trim()) throw new Error(`${label} ต้องไม่ว่าง`);
  if (value.includes(":")) throw new Error(`${label} ห้ามมีเครื่องหมาย ":"`);
}

/** สร้าง thread id ที่ผูกกับผู้ใช้: `user:<userId>:conv:<conversationId>` */
export function threadIdFor(userId: string, conversationId: string): string {
  assertPart("userId", userId);
  assertPart("conversationId", conversationId);
  return `user:${userId}:conv:${conversationId}`;
}

/**
 * ตรวจว่า threadId อยู่ใน namespace ของ userId "ที่ผู้เรียกพิสูจน์ตัวตนแล้ว" เท่านั้น
 * (userId ต้องมาจาก session/auth ไม่ใช่จาก input ที่ผู้ใช้กรอกเอง)
 */
export function assertThreadOwner(userId: string, threadId: string): void {
  const match = /^user:([^:]+):conv:([^:]+)$/.exec(threadId);
  if (!match || match[1] !== userId) {
    throw new Error("forbidden: thread นี้ไม่ใช่ของผู้ใช้");
  }
}
