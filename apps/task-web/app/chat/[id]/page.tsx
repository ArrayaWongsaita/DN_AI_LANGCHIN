"use client";
import { useParams } from "next/navigation";
import { ChatView } from "@/components/ChatView";
import { Shell } from "@/components/Shell";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <Shell><ChatView conversationId={id} /></Shell>;
}
