"use client";
import { useState } from "react";

export function Composer({ streaming, disabled, onSend, onStop }: { streaming: boolean; disabled?: boolean; onSend: (text: string) => void; onStop: () => void }) {
  const [text, setText] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || streaming || disabled) return;
    setText("");
    onSend(t);
  }
  return (
    <form onSubmit={submit} className="flex gap-2 border-t bg-white p-3">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์ข้อความ…" aria-label="ข้อความ" disabled={disabled} className="flex-1 rounded border px-3 py-2 text-sm" />
      {streaming ? (
        <button type="button" onClick={onStop} className="rounded border border-red-300 px-4 py-2 text-sm text-red-700">หยุด</button>
      ) : (
        <button type="submit" disabled={!text.trim() || disabled} className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40">ส่ง</button>
      )}
    </form>
  );
}
