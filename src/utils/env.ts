/** อ่านค่า environment variable ที่จำเป็น — ถ้าไม่มี (หรือเป็นค่าว่าง) ให้ error ที่อ่านเข้าใจง่าย */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing env var ${name} — copy .env.example to .env and set it`);
  }
  return value;
}
