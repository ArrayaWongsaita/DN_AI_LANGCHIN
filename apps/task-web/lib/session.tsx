"use client";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiClient } from "./api";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const KEY = "task-web.token";

type Session = { token: string | null; ready: boolean; api: ApiClient; login(token: string): void; logout(): void };
const Ctx = createContext<Session | null>(null);

/**
 * JWT เก็บในหน่วยความจำ + sessionStorage (รีเฟรชหน้าแล้วยังอยู่ ปิดแท็บแล้วหาย)
 * ข้อแลกเปลี่ยน: JS บนหน้าเดียวกันอ่านได้ → ถ้ามี XSS token รั่ว (httpOnly cookie ป้องกันได้ แต่ต้องมี CSRF/same-site ตามมา)
 * จึงไม่ใช้ dangerouslySetInnerHTML และ token อายุสั้น 15 นาที
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(KEY);
    tokenRef.current = saved;
    setToken(saved);
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    tokenRef.current = null;
    sessionStorage.removeItem(KEY);
    setToken(null);
    router.replace("/login");
  }, [router]);

  const login = useCallback((t: string) => {
    tokenRef.current = t;
    sessionStorage.setItem(KEY, t);
    setToken(t);
  }, []);

  const api = useMemo(() => new ApiClient({ baseUrl: API_URL, getToken: () => tokenRef.current, onUnauthorized: logout }), [logout]);
  const value = useMemo(() => ({ token, ready, api, login, logout }), [token, ready, api, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession ต้องอยู่ใน SessionProvider");
  return s;
}

/** หน้าที่ต้องล็อกอิน: ไม่มี token → ไปหน้า login */
export function useRequireAuth() {
  const s = useSession();
  const router = useRouter();
  useEffect(() => {
    if (s.ready && !s.token) router.replace("/login");
  }, [s.ready, s.token, router]);
  return s;
}
