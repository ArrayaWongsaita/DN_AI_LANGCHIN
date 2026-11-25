// 18-10: Create Evaluation Dataset
// แนวคิด: dataset = ชุดคำถาม + "สิ่งที่คาดหวัง" ที่เก็บถาวร ใช้รันซ้ำทุกครั้งที่แก้ prompt/model เพื่อเทียบคะแนน
import { Client } from "langsmith";
import { requireLangSmith } from "../../src/utils/langsmith.js";
import { uploadDataset } from "../../src/eval/dataset.js";
import { DATASET_NAME, EXAMPLE_CASES } from "./_eval.js";

requireLangSmith(); // dataset ไม่ใช้ trace แต่ต้องมี key
const client = new Client();

console.log(`dataset "${DATASET_NAME}" — ${EXAMPLE_CASES.length} กรณี:`);
for (const c of EXAMPLE_CASES) console.log(`  · ${c.id.padEnd(15)} ${c.role ? `[${c.role}] ` : ""}"${c.input}"`);

const r = await uploadDataset(client, DATASET_NAME, EXAMPLE_CASES);
console.log(r.created ? `\nสร้าง dataset ใหม่ + เพิ่ม ${r.added} examples` : "\nมี dataset นี้อยู่แล้ว (ไม่เพิ่มซ้ำ) — รันซ้ำได้ปลอดภัย");

let count = 0;
for await (const _ of client.listExamples({ datasetName: DATASET_NAME })) count++;
console.log(`ใน LangSmith ตอนนี้: ${count} examples`);
