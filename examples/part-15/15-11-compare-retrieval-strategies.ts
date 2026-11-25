// 15-11: Compare Retrieval Strategies
// ปัญหา: top-K ธรรมดาคืน "ตอนที่ 1, 2, 3" ของเรื่องเดียวกัน (ซ้ำซ้อน) แทนที่จะให้ภาพรวมกว้าง
// ทางเลือก: MMR (Maximal Marginal Relevance) = ใกล้คำถาม *และ* ต่างจากที่เลือกไปแล้ว · score threshold = ตัดผลที่ไม่ใกล้พอ · metadata filter = จำกัดขอบเขต
import { createEmbeddings } from "../../src/embeddings/index.js";
import { withDb } from "../../src/utils/db.js";
import { createPgVectorStore, upsertDocuments } from "../../src/rag/pg-store.js";
import { retryAsync } from "../../src/utils/retry.js";
import { loadLessonDocs } from "./_lessons.js";

await withDb(async (pool) => {
  const store = await createPgVectorStore({ embeddings: createEmbeddings("RETRIEVAL_DOCUMENT"), tableName: "lessons", pool });
  await retryAsync(async () => upsertDocuments(store, await loadLessonDocs()), { delayMs: 15000 }); // idempotent — ไม่ embed ซ้ำถ้ามีแล้ว
  const queryEmb = createEmbeddings("RETRIEVAL_QUERY");
  const q = "การแก้สมการและการคำนวณทางคณิตศาสตร์";
  const label = (ds: { metadata: Record<string, unknown> }[]) => ds.map((d) => String(d.metadata.id)).join(", ");
  console.log(`คำค้น: ${q}\n`);

  const qv = await retryAsync(() => queryEmb.embedQuery(q), { delayMs: 15000 });
  const plain = await store.similaritySearchVectorWithScore(qv, 4);
  console.log("1) top-K (k=4)           :", label(plain.map(([d]) => d)));
  console.log("   คะแนน (ระยะห่าง cosine — น้อย = ใกล้):", plain.map(([, s]) => s.toFixed(3)).join(", "));

  const mmr = await store.maxMarginalRelevanceSearch(q, { k: 4, fetchK: 10, lambda: 0.5 });
  console.log("2) MMR (k=4, fetchK=10)  :", label(mmr));

  const threshold = 0.3; // ระยะห่าง cosine ไม่เกินนี้ (calibrate จากข้อมูล)
  const near = plain.filter(([, s]) => s <= threshold);
  console.log(`3) threshold (distance ≤ ${threshold}):`, near.length ? label(near.map(([d]) => d)) : "(ไม่มี)");

  const filtered = await store.similaritySearchVectorWithScore(qv, 4, { subject: "science" });
  console.log("4) filter subject=science:", label(filtered.map(([d]) => d)));
});
