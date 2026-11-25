import { ConflictException, Injectable } from "@nestjs/common";

export const BUSY_MESSAGE = "ระบบกำลังตอบข้อความก่อนหน้าในบทสนทนานี้ รอให้ตอบเสร็จแล้วลองใหม่";

/**
 * One in-flight answer per conversation. Two tabs posting at once would interleave writes to the same
 * checkpointer thread. In-memory, so it holds for a single instance (same limit as the rest of the app's state).
 */
@Injectable()
export class ConversationLock {
  private readonly busy = new Set<string>();

  /** Takes the lock or throws 409; always call the returned function (in `finally`) to release. */
  acquire(conversationId: string): () => void {
    if (this.busy.has(conversationId)) throw new ConflictException(BUSY_MESSAGE);
    this.busy.add(conversationId);
    return () => void this.busy.delete(conversationId);
  }
}
