"use client";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { useSession } from "@/lib/session";

function Settings() {
  const { api } = useSession();
  const [prefs, setPrefs] = useState<Record<string, string> | null>(null);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api.get<Record<string, string>>("/preferences").then(setPrefs).catch((e: Error) => setError(e.message)), [api]);
  useEffect(() => void load(), [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try { await api.put(`/preferences/${encodeURIComponent(key.trim())}`, { value: value.trim() }); setKey(""); setValue(""); setError(null); await load(); } catch (err) { setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ"); }
  }
  async function remove(k: string) {
    try { await api.del(`/preferences/${encodeURIComponent(k)}`); await load(); } catch (e) { setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ"); }
  }
  return (
    <div className="space-y-3 p-4 text-sm">
      <h1 className="text-lg font-semibold">ความชอบของฉัน</h1>
      <p className="text-xs text-slate-500">AI จำค่าเหล่านี้ข้ามทุกบทสนทนา เช่น language = ไทย, tone = กระชับ</p>
      <form onSubmit={save} className="flex gap-2">
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="key (เช่น tone)" aria-label="key" className="w-40 rounded border px-3 py-2" />
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="ค่า" aria-label="ค่า" className="flex-1 rounded border px-3 py-2" />
        <button className="rounded bg-slate-900 px-4 py-2 text-white">บันทึก</button>
      </form>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {prefs && Object.keys(prefs).length === 0 && <p className="text-slate-500">ยังไม่มีค่าที่บันทึกไว้</p>}
      <ul className="divide-y rounded-lg border bg-white">
        {Object.entries(prefs ?? {}).map(([k, v]) => (
          <li key={k} className="flex items-center gap-3 px-3 py-2"><span className="w-40 font-mono text-xs">{k}</span><span className="flex-1">{v}</span><button onClick={() => remove(k)} className="text-xs text-red-700">ลบ</button></li>
        ))}
      </ul>
    </div>
  );
}
export default function Page() { return <Shell><Settings /></Shell>; }
