"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useRequireAuth } from "@/lib/session";

const links = [["/", "งานของฉัน"], ["/chat", "แชท"], ["/history", "ประวัติ"], ["/knowledge", "ความรู้"], ["/settings", "ตั้งค่า"]] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { ready, token, logout } = useRequireAuth();
  if (!ready || !token) return <p className="p-6 text-sm text-slate-500">กำลังโหลด…</p>;
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col">
      <nav className="flex items-center gap-4 border-b bg-white px-4 py-3 text-sm">
        <strong>AI Task Manager</strong>
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="text-slate-600 hover:text-slate-900">{label}</Link>
        ))}
        <button onClick={logout} className="ml-auto text-slate-500 hover:text-slate-900">ออกจากระบบ</button>
      </nav>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
