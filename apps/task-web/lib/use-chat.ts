"use client";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { ApiError } from "./api";
import { submitDecision } from "./approval";
import { chatReducer, initialChatState, type ServerMessage } from "./chat-reducer";
import { API_URL, useSession } from "./session";
import { streamChat } from "./sse";

/** รวม reducer + SSE + approval ไว้ที่เดียว — component แค่แสดงผล */
export function useChat(conversationId: string) {
  const { api, token, logout } = useSession();
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [messages, pending] = await Promise.all([
          api.get<ServerMessage[]>(`/conversations/${conversationId}/messages`),
          api.get<{ id: string; actions: { name: string; args: Record<string, unknown> }[] }[]>(`/conversations/${conversationId}/approvals?status=pending`),
        ]);
        if (cancelled) return;
        dispatch({ type: "load", messages });
        if (pending[0]) dispatch({ type: "approval_required", approvalId: pending[0].id, actions: pending[0].actions }); // รีเฟรชหน้าแล้ว dialog ต้องกลับมา
      } catch (e) {
        if (!cancelled) dispatch({ type: "error", message: e instanceof Error ? e.message : "โหลดบทสนทนาไม่สำเร็จ" });
      }
    })();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [api, conversationId]);

  const send = useCallback(
    async (text: string) => {
      const ac = new AbortController();
      abortRef.current = ac;
      dispatch({ type: "send", text });
      try {
        await streamChat(conversationId, text, {
          baseUrl: API_URL,
          token,
          signal: ac.signal,
          onUnauthorized: logout,
          onEvent: ({ event, data }) => {
            const d = data as Record<string, unknown>;
            if (event === "token") dispatch({ type: "token", text: String(d.text ?? "") });
            else if (event === "tool_start") dispatch({ type: "tool_start", id: String(d.id), name: String(d.name) });
            else if (event === "tool_end") dispatch({ type: "tool_end", id: String(d.id), name: String(d.name), ok: d.ok === true, content: String(d.content ?? "") });
            else if (event === "approval_required") dispatch({ type: "approval_required", approvalId: String(d.approvalId), actions: d.actions as never });
            else if (event === "done") dispatch({ type: "done", reply: String(d.reply ?? "") });
            else if (event === "error") dispatch({ type: "error", message: String(d.message ?? "เกิดข้อผิดพลาด") });
          },
        });
        dispatch({ type: "done", reply: "" }); // สตรีมจบโดยไม่มี done (เช่น server ปิดก่อน) ก็ต้องเลิก "กำลังพิมพ์"
      } catch (e) {
        dispatch({ type: "error", message: e instanceof ApiError ? e.message : "เกิดข้อผิดพลาด" });
      }
    },
    [conversationId, token, logout],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "stop" });
  }, []);

  const decide = useCallback(
    async (decision: "approve" | "reject") => {
      if (!state.approval) return;
      const res = await submitDecision(api, conversationId, state.approval.id, decision);
      dispatch({ type: "approval_resolved", reply: res.reply });
    },
    [api, conversationId, state.approval],
  );

  const lookupTitle = useCallback(async (id: string) => (await api.get<{ title: string }>(`/tasks/${id}`).catch(() => null))?.title ?? null, [api]);
  return { state, send, stop, decide, lookupTitle };
}
