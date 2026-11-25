export const TIME_ZONE = "Asia/Bangkok";

/** วันที่ (YYYY-MM-DD) ตามปฏิทินของเขตเวลา Asia/Bangkok ณ เวลา `d` */
export function bangkokDateString(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: TIME_ZONE });
}

/** วันกำหนดส่งเก็บเป็น "วันที่ล้วน" = เที่ยงคืน UTC ของวันนั้น (ไม่มีเวลา ไม่เลื่อนวันตาม timezone) */
export const dateOnly = (ymd: string): Date => new Date(`${ymd}T00:00:00.000Z`);

export const addDays = (d: Date, days: number): Date => new Date(d.getTime() + days * 86_400_000);

/** วันนี้ในเขตเวลา Bangkok เป็น "วันที่ล้วน" */
export const bangkokToday = (now: Date = new Date()): Date => dateOnly(bangkokDateString(now));

/** รับ "YYYY-MM-DD" (ใช้ตรงๆ) หรือ ISO datetime (แปลงเป็นวันที่ตามปฏิทิน Bangkok) — ไม่ถูกต้อง → throw */
export function parseDueDate(input: string | Date): Date {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const d = dateOnly(input);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== input) throw new Error("invalid date");
    return d;
  }
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) throw new Error("invalid date");
    return dateOnly(bangkokDateString(input));
  }
  // datetime ต้องมี offset ชัดเจน (Z หรือ ±hh:mm) — ไม่มี = ขึ้นกับ timezone ของเซิร์ฟเวอร์ จึงปฏิเสธ; รูปแบบอื่น ("Dec 5", "5/12/2026") ไม่เดา
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(input)) throw new Error("invalid date");
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) throw new Error("invalid date");
  return dateOnly(bangkokDateString(parsed));
}

export const formatDueDate = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);
