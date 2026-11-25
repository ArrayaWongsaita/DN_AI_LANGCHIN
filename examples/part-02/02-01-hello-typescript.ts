// 02-01: Hello TypeScript
// แนวคิด: ตรวจว่า TypeScript + ESM + tsx ทำงานได้ก่อนยุ่งกับ AI
// รัน: pnpm play 2-1  (หรือ pnpm exec tsx examples/part-02/02-01-hello-typescript.ts)

// TypeScript: กำหนด type ให้ parameter และ return value
function greet(name: string): string {
  return `สวัสดี ${name} ยินดีต้อนรับสู่ LangChain.js`;
}

// ESM: ใช้ top-level await ได้เลย (เพราะ package.json มี "type": "module")
const message = await Promise.resolve(greet("นักพัฒนา"));
console.log(message);

// ข้อมูลสภาพแวดล้อม — ใช้เช็กว่าติดตั้งถูก
console.log("Node.js:", process.version);
