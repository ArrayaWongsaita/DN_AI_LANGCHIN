export type ApprovalAction = { name: string; args: Record<string, unknown> };
export type ChatMessage = { id: number; role: "user" | "assistant"; text: string; sources?: string[] };
export type ChatState = {
  messages: ChatMessage[];
  streaming: boolean;
  tool: { id: string; name: string } | null;
  approval: { id: string; actions: ApprovalAction[] } | null;
  error: string | null;
};
export type ServerMessage = { role: "human" | "ai" | "tool"; text: string; toolCalls?: unknown[] };

export type ChatAction =
  | { type: "send"; text: string }
  | { type: "token"; text: string }
  | { type: "tool_start"; id: string; name: string }
  | { type: "tool_end"; id: string; name: string; ok: boolean; content: string }
  | { type: "approval_required"; approvalId: string; actions: ApprovalAction[] }
  | { type: "approval_resolved"; reply: string }
  | { type: "done"; reply: string }
  | { type: "error"; message: string }
  | { type: "stop" }
  | { type: "load"; messages: ServerMessage[] };

export const initialChatState: ChatState = { messages: [], streaming: false, tool: null, approval: null, error: null };

let nextId = 1;
const newId = () => nextId++;

/** ดึงชื่อแหล่งที่มาจากผล searchKnowledge (ห่อด้วย <untrusted-data> โดย server) — ไม่ใช่ JSON/ไม่พบ = ไม่มีแหล่งที่มา */
export function extractSources(content: string): string[] {
  const m = /<untrusted-data[^>]*>([\s\S]*?)<\/untrusted-data>/.exec(content);
  const raw = m ? m[1]!.trim() : content.trim();
  try {
    const parsed = JSON.parse(raw) as { results?: { source?: unknown }[] };
    return (parsed.results ?? []).map((r) => r.source).filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

const updateLast = (messages: ChatMessage[], fn: (m: ChatMessage) => ChatMessage) => (messages.length === 0 ? messages : [...messages.slice(0, -1), fn(messages.at(-1)!)]);

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "send":
      return {
        ...state,
        error: null,
        streaming: true,
        tool: null,
        messages: [...state.messages, { id: newId(), role: "user", text: action.text }, { id: newId(), role: "assistant", text: "" }],
      };
    case "token":
      return { ...state, messages: updateLast(state.messages, (m) => ({ ...m, text: m.text + action.text })) };
    case "tool_start":
      return { ...state, tool: { id: action.id, name: action.name } };
    case "tool_end": {
      const sources = action.name === "searchKnowledge" && action.ok ? extractSources(action.content) : [];
      return {
        ...state,
        tool: null,
        messages: sources.length ? updateLast(state.messages, (m) => ({ ...m, sources: [...(m.sources ?? []), ...sources] })) : state.messages,
      };
    }
    case "approval_required":
      return { ...state, approval: { id: action.approvalId, actions: action.actions } };
    case "approval_resolved":
      return {
        ...state,
        approval: null,
        messages: action.reply ? [...state.messages.filter((m, i, a) => !(i === a.length - 1 && m.role === "assistant" && m.text === "")), { id: newId(), role: "assistant", text: action.reply }] : state.messages,
      };
    case "done":
      return { ...state, streaming: false, tool: null };
    case "error":
      return { ...state, streaming: false, tool: null, error: action.message };
    case "stop":
      return { ...state, streaming: false, tool: null };
    case "load":
      return {
        ...initialChatState,
        messages: action.messages
          .filter((m) => m.role !== "tool" && m.text.trim() !== "")
          .map((m) => ({ id: newId(), role: m.role === "human" ? ("user" as const) : ("assistant" as const), text: m.text })),
      };
  }
}
