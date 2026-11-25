import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_EXAMPLES_ROOT,
  PlaygroundError,
  resolveExample,
} from "./resolve-example.js";

const arg = process.argv[2];

if (!arg) {
  const parts = existsSync(DEFAULT_EXAMPLES_ROOT)
    ? readdirSync(DEFAULT_EXAMPLES_ROOT).filter((d) => d.startsWith("part-")).sort()
    : [];
  console.log("วิธีใช้: pnpm play <part>-<example>   เช่น pnpm play 4-1");
  console.log(parts.length ? `Part ที่มีตัวอย่าง: ${parts.join(", ")}` : "ยังไม่มีตัวอย่าง");
  process.exit(0);
}

try {
  const { file } = resolveExample(arg);
  const args = [];
  const envFile = join(DEFAULT_EXAMPLES_ROOT, "..", ".env");
  if (existsSync(envFile)) args.push(`--env-file=${envFile}`);
  const result = spawnSync("pnpm", ["exec", "tsx", ...args, file], { stdio: "inherit" });
  process.exit(result.status ?? 1);
} catch (err) {
  if (err instanceof PlaygroundError) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
}
