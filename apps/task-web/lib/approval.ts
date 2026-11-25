import { ApiError, type ApiClient } from "./api";

export type DecisionOutcome = { closed: true; reply: string };

/**
 * Send an approve/reject decision. A 409 means the server refused it; if the approval is no longer
 * pending (expired after a restart, or decided from another tab) the dialog must close — otherwise the
 * user is stuck on a request that can never succeed. If it is still pending (e.g. being processed) the
 * error is rethrown so the user can retry.
 */
export async function submitDecision(api: Pick<ApiClient, "get" | "post">, conversationId: string, approvalId: string, decision: "approve" | "reject"): Promise<DecisionOutcome> {
  try {
    const res = await api.post<{ reply: string }>(`/conversations/${conversationId}/approvals/${approvalId}`, { decision });
    return { closed: true, reply: res.reply };
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 409) throw e;
    const pending = await api.get<{ id: string }[]>(`/conversations/${conversationId}/approvals?status=pending`).catch(() => null);
    if (pending && !pending.some((p) => p.id === approvalId)) return { closed: true, reply: "" };
    throw e;
  }
}
