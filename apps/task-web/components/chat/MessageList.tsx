"use client";
import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/chat-reducer";
import { Sources } from "./Sources";
import { ToolIndicator } from "./ToolIndicator";

/** แสดงข้อความเป็น text ล้วน (React escape ให้) — ไม่ render markdown/HTML จาก model เพื่อกัน XSS */
export function MessageList({ messages, tool, streaming }: { messages: ChatMessage[]; tool: { name: string } | null; streaming: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "end" }); // ห้าม return ค่า: React ถือว่าเป็น cleanup แล้วหน้าพัง
  }, [messages, tool]);
  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
      {messages.length === 0 && <p className="text-center text-sm text-slate-400">ลองพิมพ์ เช่น “เพิ่มงาน อ่านหนังสือ พรุ่งนี้” หรือ “วันนี้มีงานอะไรบ้าง”</p>}
      {messages.map((m, i) => (
        <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
          <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-slate-900 text-white" : "border bg-white"}`}>
            {m.text || (streaming && i === messages.length - 1 && !tool ? <span className="text-slate-400">กำลังคิด…</span> : null)}
            {m.sources && <Sources sources={m.sources} />}
          </div>
        </div>
      ))}
      {tool && <ToolIndicator name={tool.name} />}
      <div ref={end} />
    </div>
  );
}
