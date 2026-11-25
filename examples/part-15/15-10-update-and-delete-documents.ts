// 15-10: Update and Delete Documents
// แนวคิด: id คงที่ → แก้เนื้อหาแล้ว upsert = "แทนที่" (ไม่เพิ่มแถว, embed เฉพาะชิ้นที่เปลี่ยน); ลบตาม source หรือ id ได้
import { Document } from "@langchain/core/documents";
import { createEmbeddings } from "../../src/embeddings/index.js";
import { withDb } from "../../src/utils/db.js";
import { createPgVectorStore, deleteBySource, documentId, resetTable, upsertDocuments } from "../../src/rag/pg-store.js";
import { countingEmbeddings, loadLessonDocs } from "./_lessons.js";

await withDb(async (pool) => {
  const table = "lessons_edit_demo";
  await resetTable(table, { pool });
  const embeddings = countingEmbeddings(createEmbeddings("RETRIEVAL_DOCUMENT"));
  const store = await createPgVectorStore({ embeddings, tableName: table, pool });
  const rows = async () => (await pool.query(`select metadata->>'id' as id, left(text, 28) as text from ${table} order by 1`)).rows;
  const docs = (await loadLessonDocs(3));

  await upsertDocuments(store, docs);
  console.log("1) เพิ่ม 3 ชิ้น → embed", embeddings.documentsEmbedded, "ข้อความ | แถว:", (await rows()).length);

  embeddings.documentsEmbedded = 0;
  await upsertDocuments(store, docs);
  console.log("2) upsert ซ้ำ ไม่แก้อะไร → embed", embeddings.documentsEmbedded, "ข้อความ | แถว:", (await rows()).length);

  embeddings.documentsEmbedded = 0;
  const edited = new Document({ pageContent: "จำนวนเต็มและการบวกลบ (แก้ไขแล้ว)\nเนื้อหาใหม่หลังปรับปรุง", metadata: docs[0].metadata });
  await upsertDocuments(store, [edited, docs[1], docs[2]]);
  console.log("3) แก้ชิ้นแรก 1 ชิ้น → embed", embeddings.documentsEmbedded, "ข้อความ | แถว:", (await rows()).length);
  console.log("   ", (await rows())[0]);

  await deleteBySource(store, docs[1].metadata.source);
  console.log("4) deleteBySource(", docs[1].metadata.source, ") → แถว:", (await rows()).length);
  await store.delete({ ids: [documentId(docs[2])] });
  console.log("5) delete({ ids }) → แถว:", (await rows()).length, (await rows()).map((r) => r.id));
  await resetTable(table, { pool });
});
