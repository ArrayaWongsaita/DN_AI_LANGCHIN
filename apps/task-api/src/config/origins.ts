const DEFAULT_ORIGIN = "http://localhost:3001";

/** Origins allowed by CORS, from `WEB_ORIGIN` (comma separated; whitespace and empty entries ignored). */
export function parseOrigins(raw: string | undefined): string[] {
  const list = (raw ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  return list.length ? list : [DEFAULT_ORIGIN];
}
