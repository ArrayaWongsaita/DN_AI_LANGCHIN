"use client";
import { ApprovalDialog } from "@/components/chat/ApprovalDialog";
import { Composer } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import { useChat } from "@/lib/use-chat";

export function ChatView({ conversationId }: { conversationId: string }) {
  const { state, send, stop, decide, lookupTitle } = useChat(conversationId);
  return (
    <div className="flex h-[calc(100vh-49px)] flex-col">
      <MessageList messages={state.messages} tool={state.tool} streaming={state.streaming} />
      {state.error && <p role="alert" className="border-t bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>}
      <Composer streaming={state.streaming} disabled={!!state.approval} onSend={send} onStop={stop} />
      {state.approval && <ApprovalDialog actions={state.approval.actions} lookupTitle={lookupTitle} onDecision={decide} />}
    </div>
  );
}
