// 12-07: Store Preferences (long-term memory)
// แนวคิด: checkpointer จำ "บทสนทนานี้"; store จำ "ผู้ใช้" ข้ามทุกบทสนทนา — แยก namespace ต่อผู้ใช้
import { InMemoryStore } from "@langchain/langgraph-checkpoint";
import { deletePreferences, getPreferences, savePreference } from "../../src/memory/preferences.js";

const store = new InMemoryStore(); // ใน 12-08 และ workshop ใช้ PostgresStore (interface เดียวกัน)

await savePreference(store, "alice", "language", "ไทย");
await savePreference(store, "alice", "tone", "สุภาพ ลงท้ายค่ะ");
await savePreference(store, "bob", "language", "English");

console.log("alice:", await getPreferences(store, "alice"));
console.log("bob:  ", await getPreferences(store, "bob"));
console.log("carol:", await getPreferences(store, "carol"), "(ไม่เคยบันทึก)");

await deletePreferences(store, "alice");
console.log("\nหลังลบข้อมูลของ alice → alice:", await getPreferences(store, "alice"), "| bob ยังอยู่:", await getPreferences(store, "bob"));

try {
  await savePreference(store, "alice/../bob", "x", "y");
} catch (e) {
  console.log("userId แปลกๆ ถูกปฏิเสธ:", (e as Error).message);
}
