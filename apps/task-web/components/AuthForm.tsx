"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/session";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { api, login } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const body = mode === "login" ? { email: f.get("email"), password: f.get("password") } : { name: f.get("name"), email: f.get("email"), password: f.get("password") };
      const res = await api.post<{ token: string }>(`/auth/${mode}`, body, { auth: false });
      login(res.token);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สำเร็จ");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mx-auto mt-24 w-full max-w-sm space-y-3 rounded-lg border bg-white p-6">
      <h1 className="text-xl font-semibold">{mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</h1>
      {mode === "register" && <input name="name" required placeholder="ชื่อ" aria-label="ชื่อ" className="w-full rounded border px-3 py-2 text-sm" />}
      <input name="email" type="email" required placeholder="อีเมล" aria-label="อีเมล" className="w-full rounded border px-3 py-2 text-sm" />
      <input name="password" type="password" required minLength={8} placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว)" aria-label="รหัสผ่าน" className="w-full rounded border px-3 py-2 text-sm" />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-slate-900 py-2 text-sm text-white disabled:opacity-50">{mode === "login" ? "เข้าสู่ระบบ" : "สมัคร"}</button>
      <p className="text-center text-sm text-slate-500">
        {mode === "login" ? <>ยังไม่มีบัญชี? <Link className="underline" href="/register">สมัคร</Link></> : <>มีบัญชีแล้ว? <Link className="underline" href="/login">เข้าสู่ระบบ</Link></>}
      </p>
    </form>
  );
}
