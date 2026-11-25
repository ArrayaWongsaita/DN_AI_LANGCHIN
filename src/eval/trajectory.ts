import { isAIMessage, type BaseMessage } from "@langchain/core/messages";

export interface ExpectedCall {
  name: string;
  /** ตรวจแบบ subset: ทุก key ที่ระบุต้องตรง (key อื่นของ args จริงไม่สนใจ) */
  args?: Record<string, unknown>;
}

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
}

/** ดึง tool call ทั้งหมดจากข้อความของ agent ตามลำดับ — ใช้ตรวจ "agent เลือก tool ถูกไหม" โดยไม่ต้องอ่านข้อความตอบ */
export function extractToolCalls(messages: BaseMessage[]): ToolCallRecord[] {
  return messages.filter(isAIMessage).flatMap((m) => (m.tool_calls ?? []).map((c) => ({ name: c.name, args: c.args as Record<string, unknown> })));
}

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const argsMatch = (actual: Record<string, unknown>, expected?: Record<string, unknown>) =>
  !expected || Object.entries(expected).every(([k, v]) => sameValue(actual[k], v));

/** ตรวจ trajectory (ลำดับ tool call) — ถ้าไม่ตรง throw ข้อความที่บอกตำแหน่งแรกที่ต่าง */
export function assertTrajectory(messages: BaseMessage[], expected: ExpectedCall[], opts: { ordered?: boolean } = {}): void {
  const actual = extractToolCalls(messages);
  const ordered = opts.ordered ?? true;
  const show = (calls: { name: string }[]) => calls.map((c) => c.name).join(" → ") || "(ไม่มี)";
  const assertSameCount = () => {
    if (actual.length !== expected.length) {
      throw new Error(`จำนวน tool call ไม่ตรง: คาดหวัง ${expected.length} จริง ${actual.length}\n  คาดหวัง: ${show(expected)}\n  จริง:    ${show(actual)}`);
    }
  };

  if (!ordered) {
    assertSameCount();
    const pool = [...actual];
    for (const e of expected) {
      const i = pool.findIndex((a) => a.name === e.name && argsMatch(a.args, e.args));
      if (i < 0) throw new Error(`ไม่พบ tool call ${e.name} ${JSON.stringify(e.args ?? {})} ในผลจริง (${show(actual)})`);
      pool.splice(i, 1);
    }
    return;
  }

  // เทียบทีละตำแหน่งก่อน เพื่อรายงานจุดแรกที่ต่าง (มีประโยชน์กว่าแค่บอกว่าจำนวนไม่เท่ากัน)
  expected.slice(0, actual.length).forEach((e, i) => {
    const a = actual[i];
    if (a.name !== e.name) throw new Error(`tool call ลำดับที่ ${i + 1} ไม่ตรง: คาดหวัง ${e.name} แต่จริงคือ ${a.name}\n  จริง: ${show(actual)}`);
    if (!argsMatch(a.args, e.args)) throw new Error(`args ของ ${e.name} (ลำดับที่ ${i + 1}) ไม่ตรง: คาดหวัง ${JSON.stringify(e.args)} จริง ${JSON.stringify(a.args)}`);
  });
  assertSameCount();
}
