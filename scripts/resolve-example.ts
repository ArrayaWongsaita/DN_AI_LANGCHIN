import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_EXAMPLES_ROOT = join(here, "..", "examples");

/** ข้อผิดพลาดที่เกิดจาก input ของผู้ใช้ (แสดงข้อความสั้นๆ ไม่ต้องแสดง stack trace) */
export class PlaygroundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaygroundError";
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

export function listExamples(part: number, examplesRoot = DEFAULT_EXAMPLES_ROOT): string[] {
  const dir = join(examplesRoot, `part-${pad(part)}`);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d{2}-\d{2}-.+\.ts$/.test(f)) // ข้ามไฟล์ช่วย เช่น _helper.ts
    .sort();
}

export function resolveExample(
  arg: string,
  examplesRoot = DEFAULT_EXAMPLES_ROOT,
): { part: number; index: number; file: string } {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(arg.trim());
  if (!m) {
    throw new PlaygroundError(
      `รูปแบบไม่ถูกต้อง: "${arg}" — ใช้แบบ pnpm play 4-1 (part-example) / Invalid format, use <part>-<example>, e.g. 4-1`,
    );
  }
  const part = Number(m[1]);
  const index = Number(m[2]);
  if (part < 1 || index < 1) {
    throw new PlaygroundError(`หมายเลข part และ example ต้องเริ่มที่ 1: "${arg}"`);
  }
  const files = listExamples(part, examplesRoot);
  if (files.length === 0) {
    throw new PlaygroundError(`ยังไม่มีตัวอย่างสำหรับ Part ${pad(part)} / No examples for part ${pad(part)}`);
  }
  const prefix = `${pad(part)}-${pad(index)}-`;
  const name = files.find((f) => f.startsWith(prefix));
  if (!name) {
    throw new PlaygroundError(
      `ไม่พบตัวอย่าง ${pad(part)}-${pad(index)} — ตัวอย่างที่มีใน Part ${pad(part)}:\n  ${files.join("\n  ")}`,
    );
  }
  return { part, index, file: join(examplesRoot, `part-${pad(part)}`, name) };
}
