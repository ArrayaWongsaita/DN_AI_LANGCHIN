// 08-07: Limit Concurrency
// แนวคิด: ทำพร้อมกัน "ไม่จำกัด" อาจชน rate limit — ตั้ง maxConcurrency เพื่อจำกัดจำนวนที่ทำพร้อมกัน
// ตัวอย่างนี้ใช้ mock ที่หน่วงเวลา 300 ms เพื่อวัด "จำนวนสูงสุดที่ทำงานพร้อมกัน" ได้แน่นอนและไม่เสียโควตา
import { RunnableLambda } from "@langchain/core/runnables";

let running = 0;
let peak = 0;
const fakeApiCall = RunnableLambda.from(async (n: number) => {
  running++;
  peak = Math.max(peak, running);
  await new Promise((r) => setTimeout(r, 300)); // จำลอง latency ของ API
  running--;
  return n * 2;
});

const inputs = Array.from({ length: 8 }, (_, i) => i + 1);

for (const maxConcurrency of [undefined, 2, 4]) {
  peak = 0;
  const t = performance.now();
  await fakeApiCall.batch(inputs, maxConcurrency ? { maxConcurrency } : undefined);
  console.log(
    `maxConcurrency=${String(maxConcurrency ?? "ไม่จำกัด").padEnd(8)} → ทำพร้อมกันสูงสุด ${peak} งาน | ใช้เวลา ${Math.round(performance.now() - t)} ms`,
  );
}
// ยิ่งจำกัดมาก ยิ่งช้า แต่ปลอดภัยต่อ rate limit — เลือกตามโควตาของ provider
