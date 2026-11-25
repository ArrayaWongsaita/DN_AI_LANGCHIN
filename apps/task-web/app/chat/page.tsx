"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { useSession } from "@/lib/session";

function NewChat() {
  const { api } = useSession();
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (started.current) return; // StrictMode เรียก effect สองครั้ง ต้องไม่สร้างบทสนทนาซ้ำ
    started.current = true;
    api.post<{ id: string }>("/conversations", {}).then((c) => router.replace(`/chat/${c.id}`)).catch((e: Error) => setError(e.message));
  }, [api, router]);
  return <p className={`p-4 text-sm ${error ? "text-red-700" : "text-slate-500"}`}>{error ?? "กำลังเริ่มบทสนทนา…"}</p>;
}
export default function Page() { return <Shell><NewChat /></Shell>; }
