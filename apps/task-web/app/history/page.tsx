"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { useSession } from "@/lib/session";
import type { ConversationItem } from "@/lib/types";

function History() {
  const { api } = useSession();
  const [items, setItems] = useState<ConversationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.get<ConversationItem[]>("/conversations").then(setItems).catch((e: Error) => setError(e.message)); }, [api]);
  async function remove(id: string) {
    if (!confirm("ลบบทสนทนานี้?")) return;
    try { await api.del(`/conversations/${id}`); setItems((xs) => xs?.filter((x) => x.id !== id) ?? null); } catch (e) { setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ"); }
  }
  return (
    <div className="space-y-3 p-4">
      <Link href="/chat" className="inline-block rounded bg-slate-900 px-4 py-2 text-sm text-white">บทสนทนาใหม่</Link>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {items === null ? <p className="text-sm text-slate-500">กำลังโหลด…</p> : items.length === 0 ? <p className="text-sm text-slate-500">ยังไม่มีบทสนทนา</p> : (
        <ul className="divide-y rounded-lg border bg-white">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Link href={`/chat/${c.id}`} className="flex-1 hover:underline">{c.title ?? "บทสนทนา"}</Link>
              <span className="text-xs text-slate-500">{new Date(c.updatedAt).toLocaleString("th-TH")}</span>
              <button onClick={() => remove(c.id)} className="text-xs text-red-700">ลบ</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default function Page() { return <Shell><History /></Shell>; }
