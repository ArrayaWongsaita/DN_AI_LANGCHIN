import { Fragment } from "react";

// ตัวหนาต้องไม่ขึ้นต้น/ลงท้ายด้วยช่องว่าง (เหมือน markdown จริง) — กัน `2 ** 3 ... **` ถูกตีเป็นตัวหนา
const TOKEN = /(\*\*[^\s*](?:[^*\n]*[^\s*])?\*\*|`[^`\n]+`)/g;

/**
 * แสดง markdown ชุดย่อย (**ตัวหนา** และ `โค้ด`) จากข้อความของ model — สร้างเป็น React element เอง
 * ไม่ใช้ dangerouslySetInnerHTML และไม่แปลง HTML: ข้อความอื่นทั้งหมดยังเป็น text ล้วนที่ React escape ให้ (กัน XSS)
 */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) return <code key={i} className="rounded bg-slate-100 px-1 font-mono text-[0.85em]">{part.slice(1, -1)}</code>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
