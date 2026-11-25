import type { BaseStore } from "@langchain/langgraph-checkpoint";

export const STORE = Symbol("LANGGRAPH_STORE");

/** userId ต้องเป็น a-z A-Z 0-9 - เท่านั้น (กันใช้ namespace ของคนอื่น/ตัวอักษรพิเศษของ store) */
function assertUserId(userId: string): void {
  if (!/^[A-Za-z0-9-]+$/.test(userId)) throw new Error("userId ไม่ถูกต้อง");
}
const ns = (userId: string): string[] => ["users", userId, "preferences"];

export async function savePreference(store: BaseStore, userId: string, key: string, value: string): Promise<void> {
  assertUserId(userId);
  await store.put(ns(userId), key, { value });
}

export async function getPreferences(store: BaseStore, userId: string): Promise<Record<string, string>> {
  assertUserId(userId);
  const items = await store.search(ns(userId), { limit: 100 });
  return Object.fromEntries(items.map((i) => [i.key, String(i.value.value)]));
}

export async function deletePreference(store: BaseStore, userId: string, key: string): Promise<void> {
  assertUserId(userId);
  await store.delete(ns(userId), key);
}
