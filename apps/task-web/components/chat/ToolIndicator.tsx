const LABELS: Record<string, string> = {
  getTasks: "กำลังดูรายการงาน", getTaskById: "กำลังเปิดงาน", searchTasks: "กำลังค้นหางาน", getTodayTasks: "กำลังดูงานวันนี้", getOverdueTasks: "กำลังดูงานเลยกำหนด",
  getTaskSummary: "กำลังสรุปงาน", searchKnowledge: "กำลังค้นเอกสาร", createTask: "กำลังสร้างงาน", updateTask: "กำลังแก้ไขงาน", completeTask: "กำลังทำเครื่องหมายเสร็จ",
  changeTaskPriority: "กำลังเปลี่ยนความสำคัญ", changeTaskDueDate: "กำลังเปลี่ยนวันกำหนด", deleteTask: "กำลังขอลบงาน",
};
export function ToolIndicator({ name }: { name: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-slate-500">
      <span className="inline-block size-2 animate-pulse rounded-full bg-amber-500" />
      {LABELS[name] ?? `กำลังใช้เครื่องมือ ${name}`}…
    </div>
  );
}
