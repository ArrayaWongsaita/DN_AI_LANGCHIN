// 14-04: embedQuery()
// แนวคิด: embedQuery(text) → number[] (หนึ่ง vector) ใช้กับ "คำค้นของผู้ใช้"
// task "RETRIEVAL_QUERY" บอก Gemini ว่า vector นี้เป็นฝั่งคำค้น (คู่กับ RETRIEVAL_DOCUMENT ฝั่งเอกสารใน 14-05)
import { createEmbeddings } from "../../src/embeddings/index.js";

const v = await createEmbeddings("RETRIEVAL_QUERY").embedQuery("อุปกรณ์สำหรับเขียนโปรแกรม");
console.log("ความยาว vector:", v.length);
console.log("5 ค่าแรก:", v.slice(0, 5).map((x) => +x.toFixed(4)));
const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
console.log("ความยาว (norm):", norm.toFixed(3), norm > 0.99 && norm < 1.01 ? "(unit vector)" : "(ไม่ใช่ unit vector — ใช้ cosine จึงไม่กระทบ)");
