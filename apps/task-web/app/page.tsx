"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { useSession } from "@/lib/session";
import type { Task } from "@/lib/types";

const FILTERS = [["", "ทั้งหมด"], ["today", "วันนี้"], ["overdue", "เลยกำหนด"], ["Pending", "ยังไม่เสร็จ"], ["Completed", "เสร็จแล้ว"]] as const;

function Tasks() {
  const { api } = useSession();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [filter, setFilter] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const q = filter === "today" || filter === "overdue" ? `?${filter}=true` : filter ? `?status=${filter}` : "";
      setTasks(await api.get<Task[]>(`/tasks${q}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }, [api, filter]);
  useEffect(() => void load(), [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.post("/tasks", { title: title.trim() });
      setTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เพิ่มไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-4 p-4">
      <form onSubmit={add} className="flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เพิ่มงานใหม่…" aria-label="ชื่องานใหม่" className="flex-1 rounded border px-3 py-2 text-sm" />
        <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white">เพิ่ม</button>
      </form>
      <div className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`rounded-full border px-3 py-1 ${filter === v ? "bg-slate-900 text-white" : "bg-white"}`}>{l}</button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {tasks === null ? <p className="text-sm text-slate-500">กำลังโหลด…</p> : tasks.length === 0 ? <p className="text-sm text-slate-500">ไม่มีงาน</p> : (
        <ul className="divide-y rounded-lg border bg-white">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Link href={`/tasks/${t.id}`} className={`flex-1 hover:underline ${t.status === "Completed" ? "text-slate-400 line-through" : ""}`}>{t.title}</Link>
              <span className="text-xs text-slate-500">{t.priority}</span>
              <span className="text-xs text-slate-500">{t.dueDate ? t.dueDate.slice(0, 10) : "—"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default function Page() { return <Shell><Tasks /></Shell>; }
