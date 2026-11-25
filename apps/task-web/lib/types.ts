export type Task = { id: string; title: string; description: string | null; status: "Pending" | "InProgress" | "Completed"; priority: "Low" | "Medium" | "High"; dueDate: string | null; createdAt: string };
export type ConversationItem = { id: string; title: string | null; updatedAt: string };
export type DocumentItem = { id: string; title: string; source: string; chunks: number; createdAt: string };
