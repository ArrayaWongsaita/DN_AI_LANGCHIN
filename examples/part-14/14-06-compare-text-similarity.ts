// 14-06: Compare Text Similarity
// แนวคิด: ประโยคความหมายใกล้กัน (แม้คำไม่ซ้ำ ต่างภาษา) ได้ cosine สูงกว่าประโยคคนละเรื่อง
import { createEmbeddings } from "../../src/embeddings/index.js";
import { cosineSimilarity } from "../../src/utils/similarity.js";

const base = "ฉันอยากซื้อคอมพิวเตอร์พกพาไว้เขียนโค้ด";
const others = [
  "โน้ตบุ๊กสำหรับนักพัฒนาซอฟต์แวร์", // ความหมายใกล้ (คำไม่ซ้ำ)
  "I want to buy a laptop for programming", // ความหมายเดียวกัน คนละภาษา
  "ร้านนี้มีกาแฟอร่อยมาก", // คนละเรื่อง
  "ซื้อคอมพิวเตอร์พกพา", // คำซ้ำมาก
];
const emb = createEmbeddings();
const [b, ...vs] = await emb.embedDocuments([base, ...others]);
console.log(`ประโยคตั้งต้น: ${base}\n`);
others.forEach((t, i) => console.log(cosineSimilarity(b, vs[i]).toFixed(3), "←", t));
