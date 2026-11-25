// 15-09: Persistent Vector Store
// แนวคิด: index ครั้งเดียว ใช้ซ้ำได้ทุกครั้งที่รันโปรแกรม — upsertDocuments ข้ามเอกสารที่ไม่เปลี่ยน (ไม่เรียก embedding ซ้ำ)
// ลองรันไฟล์นี้ "สองครั้ง" แล้วเทียบ: ครั้งแรก embed 18 ชิ้น ครั้งที่สอง 0 ชิ้น
import { createEmbeddings } from "../../src/embeddings/index.js";
import { withDb } from "../../src/utils/db.js";
import { createPgVectorStore, upsertDocuments } from "../../src/rag/pg-store.js";
import { retryAsync } from "../../src/utils/retry.js";
import { countingEmbeddings, loadLessonDocs } from "./_lessons.js";

await withDb(async (pool) => {
  const embeddings = countingEmbeddings(createEmbeddings("RETRIEVAL_DOCUMENT"));
  const store = await createPgVectorStore({ embeddings, tableName: "lessons", pool });
  const count = async () => Number((await pool.query("select count(*) from lessons")).rows[0].count);

  const before = await count();
  await retryAsync(async () => upsertDocuments(store, await loadLessonDocs()), { delayMs: 15000 });
  console.log(`แถวก่อน: ${before} → หลัง: ${await count()} | ข้อความที่ส่งไป embed ในรอบนี้: ${embeddings.documentsEmbedded}`);

  const results = await retryAsync(() => store.similaritySearch("ลดราคา 20% เหลือเท่าไร", 2), { delayMs: 15000 });
  console.log("\nคำค้น: ลดราคา 20% เหลือเท่าไร");
  results.forEach((d, i) => console.log(`  ${i + 1}. ${d.metadata.id} — ${d.metadata.title}`));
});
