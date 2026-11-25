import type { BaseStore } from "@langchain/langgraph-checkpoint";

/** userId ต้องเป็นตัวอักษร/ตัวเลข/_/- เท่านั้น เพื่อไม่ให้ใช้ namespace ของคนอื่นได้ */
function assertUserId(userId: string): void {
  if (!/^[\w-]+$/.test(userId)) throw new Error("userId ไม่ถูกต้อง (ใช้ได้เฉพาะ a-z 0-9 _ -)");
}

const ns = (userId: string): string[] => ["users", userId, "preferences"];

export async function savePreference(store: BaseStore, userId: string, key: string, value: string): Promise<void> {
  assertUserId(userId);
  if (!key.trim()) throw new Error("key ต้องไม่ว่าง");
  await store.put(ns(userId), key, { value });
}

export async function getPreferences(store: BaseStore, userId: string): Promise<Record<string, string>> {
  assertUserId(userId);
  const items = await store.search(ns(userId), { limit: 1000 });
  return Object.fromEntries(items.map((i) => [i.key, String(i.value.value)]));
}

/** ลบข้อมูลของผู้ใช้คนนี้ทั้งหมด (สิทธิ์ลบข้อมูล / retention) */
export async function deletePreferences(store: BaseStore, userId: string): Promise<void> {
  assertUserId(userId);
  const items = await store.search(ns(userId), { limit: 1000 });
  await Promise.all(items.map((i) => store.delete(ns(userId), i.key)));
}
