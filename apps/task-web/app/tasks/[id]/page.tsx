"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { useSession } from "@/lib/session";
import type { Task } from "@/lib/types";

function Detail() {
  const { id } = useParams<{ id: string }>();
  const { api } = useSession();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.get<Task>(`/tasks/${id}`).then(setTask).catch((e: Error) => setError(e.message)); }, [api, id]);

  async function patch(body: object) {
    try { setTask(await api.patch<Task>(`/tasks/${id}`, body)); setError(null); } catch (e) { setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"); }
  }
  async function remove() {
    if (!confirm("ลบงานนี้?")) return;
    try { await api.del(`/tasks/${id}`); router.replace("/"); } catch (e) { setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ"); }
  }
  if (error && !task) return <p role="alert" className="p-4 text-sm text-red-700">{error}</p>;
  if (!task) return <p className="p-4 text-sm text-slate-500">กำลังโหลด…</p>;
  return (
    <div className="space-y-3 p-4 text-sm">
      <h1 className="text-xl font-semibold">{task.title}</h1>
      <p className="text-slate-600">{task.description ?? "ไม่มีรายละเอียด"}</p>
      <div className="flex flex-wrap items-center gap-3">
        <label>สถานะ <select value={task.status} onChange={(e) => patch({ status: e.target.value })} className="rounded border px-2 py-1"><option>Pending</option><option>InProgress</option><option>Completed</option></select></label>
        <label>ความสำคัญ <select value={task.priority} onChange={(e) => patch({ priority: e.target.value })} className="rounded border px-2 py-1"><option>Low</option><option>Medium</option><option>High</option></select></label>
        <label>กำหนด <input type="date" value={task.dueDate?.slice(0, 10) ?? ""} onChange={(e) => e.target.value && patch({ dueDate: e.target.value })} className="rounded border px-2 py-1" /></label>
      </div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button onClick={remove} className="rounded border border-red-300 px-3 py-1.5 text-red-700">ลบงาน</button>
    </div>
  );
}
export default function Page() { return <Shell><Detail /></Shell>; }
