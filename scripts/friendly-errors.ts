// preload ที่ pnpm play ใช้: แสดง error สั้นๆ แทน stack trace (ตั้ง DEBUG=1 เพื่อดู stack เต็ม)
function show(err: unknown): never {
  const e = err as { message?: string; status?: number; stack?: string };
  console.error(`\n❌ ${e?.message ?? String(err)}`);
  if (e?.status) console.error(`   (HTTP status ${e.status})`);
  if (process.env.DEBUG && e?.stack) console.error(e.stack);
  process.exit(1);
}
process.on("uncaughtException", show);
process.on("unhandledRejection", show);
