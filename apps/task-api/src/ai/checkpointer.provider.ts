import { MemorySaver } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import type { Provider } from "@nestjs/common";

/** Token for the conversation checkpointer (history lives here). */
export const CHECKPOINTER = Symbol("CHECKPOINTER");

/** Own schema, so LangGraph's tables never mix with Prisma's. */
export const CHECKPOINT_SCHEMA = "langgraph";

/**
 * Postgres by default (history survives restarts and is shared by instances).
 * `CHECKPOINTER=memory` keeps it in process — handy for a quick local run without a DB.
 */
export const checkpointerProvider: Provider = {
  provide: CHECKPOINTER,
  useFactory: async (): Promise<BaseCheckpointSaver> => {
    if (process.env.CHECKPOINTER === "memory") return new MemorySaver();
    const url = process.env.TASK_API_DATABASE_URL;
    if (!url) throw new Error("ต้องตั้ง TASK_API_DATABASE_URL (หรือ CHECKPOINTER=memory เพื่อเก็บประวัติในหน่วยความจำ)");
    const saver = PostgresSaver.fromConnString(url, { schema: CHECKPOINT_SCHEMA });
    await saver.setup(); // creates tables on first run; safe to repeat
    return saver;
  },
};

const closed = new WeakSet<object>();

/** Closes the pool on shutdown (only Postgres savers have one); calling it twice is harmless. */
export async function closeCheckpointer(saver: BaseCheckpointSaver): Promise<void> {
  if (!(saver instanceof PostgresSaver) || closed.has(saver)) return;
  closed.add(saver);
  await saver.end();
}
