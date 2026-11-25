"use client";
import { useEffect, useState } from "react";
import type { ApprovalAction } from "@/lib/chat-reducer";

type Props = {
  actions: ApprovalAction[];
  /** ดึงชื่องานจาก id เพื่อให้ผู้ใช้เห็นว่ากำลังจะลบ "อะไร" ไม่ใช่แค่ uuid */
  lookupTitle?: (taskId: string) => Promise<string | null>;
  onDecision: (decision: "approve" | "reject") => Promise<void>;
};

export function ApprovalDialog({ actions, lookupTitle, onDecision }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!lookupTitle) return;
    for (const a of actions) {
      const id = typeof a.args.id === "string" ? a.args.id : null;
      if (id) void lookupTitle(id).then((t) => t && setTitles((s) => ({ ...s, [id]: t })));
    }
  }, [actions, lookupTitle]);

  async function decide(d: "approve" | "reject") {
    if (busy) return; // กดซ้ำไม่ส่งซ้ำ
    setBusy(true);
    setError(null);
    try {
      await onDecision(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="approval-title" className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 id="approval-title" className="text-lg font-semibold">ต้องการการอนุมัติ</h2>
        <p className="mt-1 text-sm text-slate-600">AI ต้องการทำรายการที่ย้อนกลับไม่ได้ ตรวจสอบก่อนอนุมัติ</p>
        <ul className="mt-3 space-y-2">
          {actions.map((a, i) => {
            const id = typeof a.args.id === "string" ? a.args.id : null;
            return (
              <li key={i} className="rounded border border-red-200 bg-red-50 p-3 text-sm">
                <div className="font-mono text-xs text-red-700">{a.name}</div>
                <div className="mt-1">{id && titles[id] ? <>ลบงาน “{titles[id]}”</> : <span className="font-mono text-xs">{JSON.stringify(a.args)}</span>}</div>
              </li>
            );
          })}
        </ul>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => decide("reject")} className="rounded border px-3 py-1.5 text-sm disabled:opacity-50">
            ปฏิเสธ
          </button>
          <button type="button" disabled={busy} onClick={() => decide("approve")} className="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
            อนุมัติ
          </button>
        </div>
      </div>
    </div>
  );
}
