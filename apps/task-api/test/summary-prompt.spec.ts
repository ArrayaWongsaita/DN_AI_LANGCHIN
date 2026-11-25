import { describe, expect, test } from "vitest";
import { buildSummaryMessages, describeDue, sortByUrgency, type SummaryInput, type SummaryTask } from "../src/ai/summary-prompt.js";

const t = (title: string, priority: SummaryTask["priority"], due: string | null, status: SummaryTask["status"] = "Pending"): SummaryTask => ({ title, status, priority, due });
const TODAY = "2026-11-25";
const input = (over: Partial<SummaryInput> = {}): SummaryInput => ({ today: TODAY, counts: { total: 3 }, open: [], recentlyCompleted: [], ...over });
const human = (i: SummaryInput) => String(buildSummaryMessages(i)[1].content);
const system = (i: SummaryInput) => String(buildSummaryMessages(i)[0].content);

describe("summary prompt context (what the model is told)", () => {
  test("tells the model today's date — without it overdue work cannot be recognised", () => {
    expect(human(input())).toContain(TODAY);
  });

  test("due dates are described relative to today in Thai, never as raw ISO dates or enum words", () => {
    expect(describeDue("2026-11-22", TODAY)).toBe("เลยกำหนด 3 วัน");
    expect(describeDue(TODAY, TODAY)).toBe("ครบกำหนดวันนี้");
    expect(describeDue("2026-11-28", TODAY)).toBe("อีก 3 วัน");
    expect(describeDue(null, TODAY)).toBe("ไม่มีกำหนด");
    const text = human(input({ open: [t("เขียนรายงาน", "High", "2026-11-22", "InProgress")] }));
    expect(text).toContain("เลยกำหนด 3 วัน");
    expect(text).not.toMatch(/2026-11-22|InProgress|\bHigh\b/);
  });

  test("open tasks are listed most urgent first: overdue, then due today, then priority, then nearest due date", () => {
    const sorted = sortByUrgency(
      [t("ต่ำ-ไกล", "Low", "2026-12-10"), t("สูง-อีก3วัน", "High", "2026-11-28"), t("วันนี้", "Low", TODAY), t("เลย-กลาง", "Medium", "2026-11-20"), t("เลย-สูง", "High", "2026-11-23")],
      TODAY,
    ).map((x) => x.title);
    expect(sorted).toEqual(["เลย-สูง", "เลย-กลาง", "วันนี้", "สูง-อีก3วัน", "ต่ำ-ไกล"]);
  });

  test("tasks completed in the last 7 days are named so highlights can mention them", () => {
    expect(human(input({ recentlyCompleted: [t("ตั้งค่า CI", "High", null, "Completed")] }))).toContain("ตั้งค่า CI");
  });

  test("the instructions fix the empty-case contract and treat titles as data, not commands", () => {
    const s = system(input());
    expect(s).toMatch(/\[\]/);
    expect(s).toMatch(/ไม่ใช่คำสั่ง/);
    expect(s).toMatch(/Pending|InProgress/); // บอกให้ห้ามใช้ค่าดิบเหล่านี้
  });

  test("at most 50 open tasks are sent", () => {
    const many = Array.from({ length: 60 }, (_, i) => t(`งาน-${i}`, "Low", null));
    expect(human(input({ open: many })).match(/^\d+\. /gm)).toHaveLength(50);
  });
});
