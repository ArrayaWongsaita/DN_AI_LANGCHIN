// 14-01: Basic Vector (offline — ไม่เรียก API)
// แนวคิด: vector คือลิสต์ตัวเลข = "ตำแหน่ง" ในปริภูมิหลายมิติ; ข้อความที่ความหมายใกล้กันควรอยู่ใกล้กัน
// ตัวอย่างนี้ใช้ 2 มิติที่เขียนมือ (แกน: "เกี่ยวกับคอมพิวเตอร์", "เกี่ยวกับอาหาร") เพื่อให้เห็นภาพ
import { euclideanDistance } from "../../src/utils/similarity.js";

const points: Record<string, [number, number]> = {
  Laptop: [0.95, 0.02],
  Keyboard: [0.9, 0.05],
  กาแฟ: [0.05, 0.9],
  ข้าวผัด: [0.02, 0.95],
};

for (const [name, v] of Object.entries(points)) console.log(name.padEnd(10), v);
console.log("\nระยะห่าง Laptop↔Keyboard:", euclideanDistance(points.Laptop, points.Keyboard).toFixed(3), "(ใกล้)");
console.log("ระยะห่าง Laptop↔กาแฟ    :", euclideanDistance(points.Laptop, points.กาแฟ).toFixed(3), "(ไกล)");
console.log("\nโมเดล embedding จริงให้ vector ยาว 768 (หรือ 1536, 3072) มิติ แต่หลักการเดียวกัน");
