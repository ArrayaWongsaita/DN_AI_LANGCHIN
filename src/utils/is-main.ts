import { pathToFileURL } from "node:url";

/** true เมื่อไฟล์นี้ถูกรันตรงๆ (ไม่ใช่ถูก import) — ใช้ pathToFileURL เพื่อรองรับ path ที่มีภาษาไทย/ช่องว่าง/Windows */
export function isMain(metaUrl: string, argv1: string | undefined = process.argv[1]): boolean {
  return argv1 !== undefined && metaUrl === pathToFileURL(argv1).href;
}
