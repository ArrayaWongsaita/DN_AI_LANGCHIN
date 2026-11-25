import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Inject, Injectable } from "@nestjs/common";
import { addDays, bangkokDateString, formatDueDate } from "../tasks/dates.js";
import { TasksService } from "../tasks/tasks.service.js";
import { CHAT_MODEL } from "./model.provider.js";
import { WeeklySummary, buildSummaryMessages, type SummaryTask } from "./summary-prompt.js";

export { WeeklySummary } from "./summary-prompt.js";

@Injectable()
export class SummaryService {
  constructor(
    @Inject(CHAT_MODEL) private model: BaseChatModel,
    @Inject(TasksService) private readonly tasks: TasksService,
  ) {}

  async weekly(userId: string, now: Date = new Date()) {
    const counts = await this.tasks.summary(userId, now);
    const all = await this.tasks.list(userId, {}, now);
    const toTask = (t: (typeof all)[number]): SummaryTask => ({ title: t.title, status: t.status, priority: t.priority, due: formatDueDate(t.dueDate) });
    const open = all.filter((t) => t.status !== "Completed").map(toTask);
    const recentlyCompleted = all.filter((t) => t.status === "Completed" && t.updatedAt >= addDays(now, -7)).map(toTask);
    const extractor = this.model.withStructuredOutput(WeeklySummary, { name: "weekly_summary" });
    const raw = await extractor.invoke(buildSummaryMessages({ today: bangkokDateString(now), counts, open, recentlyCompleted }));
    const checked = WeeklySummary.safeParse(raw); // parser ของ provider ไม่การันตี schema — ตรวจซ้ำเอง
    if (!checked.success) throw new Error("output_parse_failed: weekly summary ไม่ตรง schema");
    return { summary: checked.data, counts };
  }
}
