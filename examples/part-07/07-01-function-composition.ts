// 07-01: Function Composition
// แนวคิด: ก่อนรู้จัก LCEL — การ "ประกอบ" ก็คือเอา output ของฟังก์ชันหนึ่งไปเป็น input ของอีกฟังก์ชัน
// ตัวอย่างนี้ไม่ใช้ LLM
const trim = (s: string) => s.trim();
const toUpper = (s: string) => s.toUpperCase();
const exclaim = (s: string) => `${s}!`;

// แบบเรียกซ้อนกัน อ่านจากในออกนอก
console.log("ซ้อนกัน :", exclaim(toUpper(trim("  hello  "))));

// pipeline: ประกอบเป็นฟังก์ชันใหม่ อ่านซ้ายไปขวา (input → process → output)
const pipe =
  <T>(...fns: ((x: T) => T)[]) =>
  (input: T) =>
    fns.reduce((acc, fn) => fn(acc), input);

const shout = pipe(trim, toUpper, exclaim);
console.log("pipeline:", shout("  hello  "));

// Sequential: ขั้นตอนต่อกัน (B ต้องรอ A) · Parallel: ขั้นตอนที่ไม่พึ่งกันทำพร้อมกันได้
const [a, b] = await Promise.all([Promise.resolve(shout("a")), Promise.resolve(shout("b"))]);
console.log("parallel :", a, b);
// LCEL ทำสิ่งเดียวกันนี้ แต่ใช้กับ "ชิ้นส่วน AI" (prompt, model, parser) ที่มี interface เดียวกัน (Runnable)
