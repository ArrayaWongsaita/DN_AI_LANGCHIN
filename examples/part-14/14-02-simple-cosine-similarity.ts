// 14-02: Simple Cosine Similarity (offline)
// แนวคิด: cosine = มุมระหว่าง vector (ไม่สนความยาว) → 1 ทิศทางเดียวกัน, 0 ตั้งฉาก, -1 ตรงข้าม
// เทียบกับ dot product (ได้รับผลจากความยาว) และ Euclidean (ระยะห่าง — ยิ่งน้อยยิ่งคล้าย)
import { cosineSimilarity, dotProduct, euclideanDistance } from "../../src/utils/similarity.js";

const a = [1, 0];
const pairs: [string, number[]][] = [
  ["ทิศเดียวกัน [2, 0]", [2, 0]],
  ["ใกล้เคียง [0.9, 0.1]", [0.9, 0.1]],
  ["ตั้งฉาก [0, 1]", [0, 1]],
  ["ตรงข้าม [-1, 0]", [-1, 0]],
];
console.log("เทียบกับ a = [1, 0]\n");
console.log("เทียบกับ".padEnd(22), "cosine".padStart(7), "dot".padStart(6), "euclid".padStart(7));
for (const [label, b] of pairs) {
  console.log(label.padEnd(22), cosineSimilarity(a, b).toFixed(3).padStart(7), dotProduct(a, b).toFixed(1).padStart(6), euclideanDistance(a, b).toFixed(2).padStart(7));
}
console.log("\n[2,0] ยาวกว่า [1,0] สองเท่า: cosine ยังเป็น 1 แต่ dot = 2 และ euclid = 1 → เลือกตัววัดให้ตรงกับโมเดล (Gemini แนะนำ cosine)");
console.log("vector ศูนย์:", cosineSimilarity([0, 0], [1, 0]), "(ไม่หารศูนย์ — คืน 0)");
