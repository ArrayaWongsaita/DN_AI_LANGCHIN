// 15-08: PostgreSQL pgvector Setup (ต้อง `docker compose up -d`)
// แนวคิด: pgvector เพิ่มชนิดข้อมูล vector(N) และตัวดำเนินการระยะห่างให้ PostgreSQL → เก็บและค้น embedding ในฐานข้อมูลเดิมได้
// index: ข้อมูลน้อย (หลักสิบ–พัน แถว) ไม่ต้องสร้าง index — PostgreSQL ทำ exact scan (แม่นยำ 100%) เร็วพอ
//        ข้อมูลมาก ค่อยสร้าง ANN index (HNSW / IVFFlat) ยอมลดความแม่นเล็กน้อยแลกความเร็ว (ดู README)
import { createEmbeddings } from "../../src/embeddings/index.js";
import { withDb } from "../../src/utils/db.js";
import { createPgVectorStore, resetTable } from "../../src/rag/pg-store.js";

await withDb(async (pool) => {
  const table = "lessons_setup_demo";
  await resetTable(table, { pool });
  const store = await createPgVectorStore({ embeddings: createEmbeddings(), tableName: table, pool });

  const ext = await pool.query("select extversion from pg_extension where extname = 'vector'");
  console.log("pgvector extension version:", ext.rows[0].extversion);
  const cols = await pool.query(
    `select a.attname as column, format_type(a.atttypid, a.atttypmod) as type
     from pg_attribute a where a.attrelid = $1::regclass and a.attnum > 0 and not a.attisdropped order by a.attnum`,
    [table],
  );
  console.table(cols.rows);
  const idx = await pool.query("select indexname from pg_indexes where tablename = $1", [table]);
  console.log("index ที่มี:", idx.rows.map((r) => r.indexname), "(มีแค่ primary key — ไม่มี vector index เพราะข้อมูลน้อย)");
  await resetTable(table, { pool });
  void store;
});
