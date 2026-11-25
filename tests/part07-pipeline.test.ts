import { AIMessage } from "@langchain/core/messages";
import { RunnableLambda } from "@langchain/core/runnables";
import { describe, expect, test } from "vitest";
import { buildContentProcessor } from "../workshops/part-07/solution/content-processor.js";

/** model ปลอมที่ตอบตาม "TASK:" ที่ปรากฏใน prompt — deterministic ไม่ขึ้นกับลำดับการเรียกแบบขนาน */
function fakeModel(overrides: Partial<Record<"summary" | "keywords" | "sentiment" | "title", string>> = {}) {
  const answers = {
    summary: "สรุปสั้นๆ ของบทความ",
    keywords: "langchain, agent , langchain, rag",
    sentiment: "Positive.",
    title: "ชื่อเรื่องที่แนะนำ",
    ...overrides,
  };
  return RunnableLambda.from(async (input: { toString(): string }) => {
    const text = input.toString();
    const task = (Object.keys(answers) as (keyof typeof answers)[]).find((t) => text.includes(`TASK:${t}`));
    if (!task) throw new Error(`unexpected prompt: ${text.slice(0, 40)}`);
    return new AIMessage(answers[task]);
  });
}

describe("buildContentProcessor", () => {
  test("returns summary, keywords, sentiment and title", async () => {
    const out = await buildContentProcessor(fakeModel()).invoke({ article: "บทความ" });
    expect(out.summary).toBe("สรุปสั้นๆ ของบทความ");
    expect(out.title).toBe("ชื่อเรื่องที่แนะนำ");
    expect(out.sentiment).toBe("positive");
  });

  test("keywords are trimmed and de-duplicated", async () => {
    const out = await buildContentProcessor(fakeModel()).invoke({ article: "บทความ" });
    expect(out.keywords).toEqual(["langchain", "agent", "rag"]);
  });

  test("unknown sentiment text falls back to neutral", async () => {
    const out = await buildContentProcessor(fakeModel({ sentiment: "ไม่แน่ใจ??" })).invoke({ article: "บทความ" });
    expect(out.sentiment).toBe("neutral");
  });

  test("rejects an empty article before calling the model", async () => {
    await expect(buildContentProcessor(fakeModel()).invoke({ article: "   " })).rejects.toThrow(/article ว่าง/);
  });
});
