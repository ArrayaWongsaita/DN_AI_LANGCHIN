import { InMemoryStore } from "@langchain/langgraph-checkpoint";
import { describe, expect, test } from "vitest";
import { assertThreadOwner, threadIdFor } from "../src/memory/thread-access.js";
import { deletePreferences, getPreferences, savePreference } from "../src/memory/preferences.js";

describe("threadIdFor", () => {
  test("formats user and conversation into a namespaced id", () => {
    expect(threadIdFor("u1", "c1")).toBe("user:u1:conv:c1");
  });
  test.each([["", "c1"], ["  ", "c1"], ["u1", ""], ["u1", "   "], ["a:b", "c1"], ["u1", "x:y"]])(
    "rejects empty/whitespace/colon parts (%j, %j)",
    (u, c) => {
      expect(() => threadIdFor(u, c)).toThrow();
    },
  );
});

describe("assertThreadOwner", () => {
  test("own thread passes", () => {
    expect(() => assertThreadOwner("u1", threadIdFor("u1", "c1"))).not.toThrow();
  });
  test("another user's thread is forbidden", () => {
    expect(() => assertThreadOwner("u1", threadIdFor("u2", "c1"))).toThrow(/^forbidden/);
  });
  test("a crafted id supplied by u2 is judged against the caller's userId", () => {
    // u2 ส่ง threadId ของ u1 มาเอง — ต้องถูกปฏิเสธเพราะตรวจกับ userId ของผู้เรียก (u2)
    expect(() => assertThreadOwner("u2", "user:u1:conv:x")).toThrow(/^forbidden/);
  });
  test("prefix lookalike is not ownership (u1 vs u10)", () => {
    expect(() => assertThreadOwner("u1", threadIdFor("u10", "c1"))).toThrow(/^forbidden/);
  });
  test("malformed or empty thread id is forbidden", () => {
    expect(() => assertThreadOwner("u1", "")).toThrow(/^forbidden/);
    expect(() => assertThreadOwner("u1", "random")).toThrow(/^forbidden/);
  });
});

describe("preferences", () => {
  test("save/get round trip and overwrite", async () => {
    const store = new InMemoryStore();
    await savePreference(store, "u1", "language", "ไทย");
    await savePreference(store, "u1", "tone", "สุภาพ");
    expect(await getPreferences(store, "u1")).toEqual({ language: "ไทย", tone: "สุภาพ" });
    await savePreference(store, "u1", "tone", "เป็นกันเอง");
    expect((await getPreferences(store, "u1")).tone).toBe("เป็นกันเอง");
  });
  test("users are isolated from each other", async () => {
    const store = new InMemoryStore();
    await savePreference(store, "u1", "language", "ไทย");
    await savePreference(store, "u2", "language", "English");
    expect(await getPreferences(store, "u1")).toEqual({ language: "ไทย" });
    expect(await getPreferences(store, "u2")).toEqual({ language: "English" });
    expect(await getPreferences(store, "u3")).toEqual({});
  });
  test("deletePreferences removes only that user's keys", async () => {
    const store = new InMemoryStore();
    await savePreference(store, "u1", "a", "1");
    await savePreference(store, "u2", "a", "2");
    await deletePreferences(store, "u1");
    expect(await getPreferences(store, "u1")).toEqual({});
    expect(await getPreferences(store, "u2")).toEqual({ a: "2" });
  });
  test("a userId that looks like a namespace path cannot reach other users", async () => {
    const store = new InMemoryStore();
    await savePreference(store, "u2", "secret", "x");
    await expect(savePreference(store, "u1/../u2", "k", "v")).rejects.toThrow();
  });
  test("empty userId or key is rejected", async () => {
    const store = new InMemoryStore();
    await expect(savePreference(store, "", "k", "v")).rejects.toThrow();
    await expect(savePreference(store, "u1", " ", "v")).rejects.toThrow();
    await expect(getPreferences(store, "  ")).rejects.toThrow();
    await expect(deletePreferences(store, "")).rejects.toThrow();
  });
});

// ---- Workshop: personal assistant (scripted model, MemorySaver + InMemoryStore) ----
import { MemorySaver } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import { messageText } from "../src/utils/text.js";
import { createScriptedChatModel } from "../src/utils/scripted-model.js";
import { chat } from "../workshops/part-12/solution/personal-assistant.js";

const texts = (calls: Parameters<typeof messageText>[0][][]) => calls.map((c) => c.map((m) => messageText(m)).join("|"));

describe("personal assistant", () => {
  const setup = () => ({
    checkpointer: new MemorySaver(),
    store: new InMemoryStore(),
    model: createScriptedChatModel(Array.from({ length: 10 }, (_, i) => new AIMessage(`ตอบ ${i + 1}`))),
  });

  test("same conversation sees earlier messages; another conversation does not", async () => {
    const s = setup();
    await chat({ ...s, userId: "alice", conversationId: "c1", message: "ฉันชื่อมะลิ" });
    await chat({ ...s, userId: "alice", conversationId: "c1", message: "ฉันชื่ออะไร" });
    await chat({ ...s, userId: "alice", conversationId: "c2", message: "สวัสดี" });
    const [, second, third] = texts(s.model.seenMessages);
    expect(second).toContain("ฉันชื่อมะลิ");
    expect(third).not.toContain("ฉันชื่อมะลิ");
  });

  test("two users never see each other's history even with the same conversation id", async () => {
    const s = setup();
    await chat({ ...s, userId: "alice", conversationId: "c1", message: "ความลับของ alice" });
    await chat({ ...s, userId: "bob", conversationId: "c1", message: "สวัสดี" });
    expect(texts(s.model.seenMessages)[1]).not.toContain("ความลับของ alice");
  });

  test("preferences of the caller are injected into the system prompt, not other users'", async () => {
    const s = setup();
    await savePreference(s.store, "alice", "โทน", "สุภาพ");
    await savePreference(s.store, "bob", "โทน", "กันเอง-bob");
    await chat({ ...s, userId: "alice", conversationId: "c1", message: "hi" });
    const seen = texts(s.model.seenMessages)[0];
    expect(seen).toContain("สุภาพ");
    expect(seen).not.toContain("กันเอง-bob");
  });

  test("opening someone else's thread id is forbidden and never reaches the model", async () => {
    const s = setup();
    await chat({ ...s, userId: "alice", conversationId: "c1", message: "ลับ" });
    await expect(chat({ ...s, userId: "bob", threadId: "user:alice:conv:c1", message: "แอบดู" })).rejects.toThrow(/^forbidden/);
    expect(s.model.calls).toBe(1);
  });

  test("history survives a new agent instance on the same checkpointer (restart)", async () => {
    const s = setup();
    await chat({ ...s, userId: "alice", conversationId: "c1", message: "รหัส ORCHID-42" });
    const model2 = createScriptedChatModel([new AIMessage("ORCHID-42")]);
    await chat({ checkpointer: s.checkpointer, store: s.store, model: model2, userId: "alice", conversationId: "c1", message: "รหัสคืออะไร" });
    expect(texts(model2.seenMessages)[0]).toContain("ORCHID-42");
  });
});
