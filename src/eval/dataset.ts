import type { ZodType } from "zod";
import type { ExpectedCall } from "./trajectory.js";

/** กรณีทดสอบ 1 ข้อ: input + สิ่งที่คาดหวัง (เฉพาะส่วนที่ระบุจะถูกตรวจ) */
export interface EvalCase {
  id: string;
  input: string;
  /** สิทธิ์ของผู้ใช้ที่ถามในกรณีนี้ (ค่าเริ่มต้น admin) — ใช้ทดสอบ "ไม่มีสิทธิ์" */
  role?: "viewer" | "editor" | "admin";
  expected: {
    /** ลำดับ tool call ที่คาดหวัง ([] = ต้องไม่เรียก tool เลย) */
    tools?: ExpectedCall[];
    /** คำที่ต้องอยู่ในคำตอบ (ไม่สนตัวพิมพ์เล็ก/ใหญ่) */
    contains?: string[];
    /** คำที่ห้ามอยู่ในคำตอบ */
    forbidden?: string[];
    /** รูปร่างของ structured output (ใช้ตอนรัน local เท่านั้น — Zod serialize ขึ้น LangSmith ไม่ได้) */
    schema?: ZodType;
    /** คำตอบอ้างอิงสำหรับ LLM judge */
    reference?: string;
    /** เพดาน token ต่อคำตอบ */
    maxTokens?: number;
    /** คาดหวังว่า agent ต้องหยุดรออนุมัติ (true) หรือต้องไม่หยุด (false) */
    interrupted?: boolean;
  };
}

type Expected = EvalCase["expected"];
export type LangSmithExample = { inputs: { question: string; role?: string }; outputs: Record<string, unknown>; metadata: { id: string } };

/** แปลง EvalCase → รูปแบบ example ของ LangSmith (inputs/outputs เป็น JSON ล้วน — schema ถูกตัดทิ้ง) */
export function evalCasesToExamples(cases: EvalCase[]): LangSmithExample[] {
  return cases.map((c) => {
    const { schema: _schema, ...serialisable } = c.expected;
    return { inputs: { question: c.input, ...(c.role ? { role: c.role } : {}) }, outputs: serialisable as Record<string, unknown>, metadata: { id: c.id } };
  });
}

/** กลับด้าน: reference outputs ของ example → expected */
export function fromReferenceOutputs(outputs: Record<string, unknown> | undefined): Expected {
  return (outputs ?? {}) as Expected;
}

/** อัปโหลด dataset ถ้ายังไม่มี (idempotent: มีแล้วไม่สร้าง example ซ้ำ) — คืนจำนวน example ที่เพิ่มใหม่ */
export async function uploadDataset(
  client: {
    hasDataset(p: { datasetName: string }): Promise<boolean>;
    createDataset(name: string, o?: { description?: string }): Promise<unknown>;
    createExamples(p: { datasetName: string; inputs: Record<string, unknown>[]; outputs: Record<string, unknown>[]; metadata: Record<string, unknown>[] }): Promise<unknown>;
  },
  datasetName: string,
  cases: EvalCase[],
): Promise<{ created: boolean; added: number }> {
  if (await client.hasDataset({ datasetName })) return { created: false, added: 0 };
  await client.createDataset(datasetName, { description: "ชุดทดสอบ agent จัดการงาน (Part 18)" });
  const ex = evalCasesToExamples(cases);
  await client.createExamples({ datasetName, inputs: ex.map((e) => e.inputs), outputs: ex.map((e) => e.outputs), metadata: ex.map((e) => e.metadata) });
  return { created: true, added: ex.length };
}
