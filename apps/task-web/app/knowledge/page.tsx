"use client";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { useSession } from "@/lib/session";
import type { DocumentItem } from "@/lib/types";

const MAX_CHARS = 30_000;

function Knowledge() {
  const { api } = useSession();
  const [docs, setDocs] = useState<DocumentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.get<DocumentItem[]>("/documents").then(setDocs).catch((e: Error) => setError(e.message)), [api]);
  useEffect(() => void load(), [load]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) return setError("รองรับเฉพาะไฟล์ .txt และ .md");
    setBusy(true);
    setError(null);
    try {
      const content = await file.text();
      if (content.length > MAX_CHARS) throw new Error(`ไฟล์ยาวเกิน ${MAX_CHARS.toLocaleString()} ตัวอักษร`);
      await api.post("/documents", { title: file.name.replace(/\.(txt|md)$/i, ""), filename: file.name, content });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("ลบเอกสารนี้และความรู้ที่สร้างจากมัน?")) return;
    try { await api.del(`/documents/${id}`); await load(); } catch (e) { setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ"); }
  }
  return (
    <div className="space-y-3 p-4 text-sm">
      <label className="inline-block cursor-pointer rounded bg-slate-900 px-4 py-2 text-white">
        {busy ? "กำลังประมวลผล…" : "อัปโหลดเอกสาร (.txt / .md)"}
        <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={upload} disabled={busy} className="hidden" aria-label="อัปโหลดเอกสาร" />
      </label>
      <p className="text-xs text-slate-500">เอกสารถูกแบ่งเป็นส่วนๆ แล้วแปลงเป็นเวกเตอร์ เพื่อให้ AI ค้นและอ้างอิงแหล่งที่มาในแชท</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {docs === null ? <p className="text-slate-500">กำลังโหลด…</p> : docs.length === 0 ? <p className="text-slate-500">ยังไม่มีเอกสาร</p> : (
        <ul className="divide-y rounded-lg border bg-white">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2">
              <span className="flex-1">{d.title} <span className="text-xs text-slate-500">({d.source}, {d.chunks} ส่วน)</span></span>
              <button onClick={() => remove(d.id)} className="text-xs text-red-700">ลบ</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default function Page() { return <Shell><Knowledge /></Shell>; }
