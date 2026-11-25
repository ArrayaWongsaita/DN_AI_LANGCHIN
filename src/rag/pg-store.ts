import { createHash } from "node:crypto";
import type { Document } from "@langchain/core/documents";
import type { Embeddings } from "@langchain/core/embeddings";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import type pg from "pg";
import { EMBEDDING_DIMENSIONS } from "../embeddings/index.js";
import { createPool } from "../utils/db.js";

const TABLE_NAME_RE = /^[a-z_][a-z0-9_]*$/;

/** ชื่อตารางถูกต่อเข้า SQL ตรงๆ จึงต้องเป็น a-z, 0-9, _ เท่านั้น (กัน SQL injection) */
export function assertTableName(name: string): void {
  if (!TABLE_NAME_RE.test(name)) throw new Error(`ชื่อตารางไม่ถูกต้อง "${name}" — ใช้ได้เฉพาะ a-z 0-9 _ และต้องไม่ขึ้นต้นด้วยตัวเลข`);
}

/** id (uuid) ที่คงที่ต่อ source+chunkIndex (หรือ metadata.id) — ใช้ทำ upsert/ลบ/อัปเดตแบบ idempotent */
export function documentId(doc: Document): string {
  const { source, chunkIndex, id } = doc.metadata as { source?: string; chunkIndex?: number; id?: string };
  const key = id !== undefined ? `id:${id}` : source !== undefined && chunkIndex !== undefined ? `${source}\u0000${chunkIndex}` : undefined;
  if (key === undefined) throw new Error("Document ต้องมี metadata.id หรือ metadata.source + metadata.chunkIndex เพื่อสร้าง id");
  const h = createHash("sha256").update(key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export interface PgStoreOptions {
  embeddings: Embeddings;
  tableName: string;
  /** ถ้าไม่ส่ง จะสร้างจาก DATABASE_URL (และ store.end() จะปิดให้) */
  pool?: pg.Pool;
  /** ขนาด vector ของคอลัมน์ (ค่าเริ่มต้น = EMBEDDING_DIMENSIONS) */
  dimensions?: number;
}

/** สร้าง extension/ตาราง (vector(N)) ถ้ายังไม่มี และตรวจว่าตารางเดิมมีมิติตรงกับที่ขอ */
export async function createPgVectorStore(opts: PgStoreOptions): Promise<PGVectorStore> {
  const { embeddings, tableName, dimensions = EMBEDDING_DIMENSIONS } = opts;
  assertTableName(tableName);
  const pool = opts.pool ?? createPool();
  try {
    // ไม่ใช้ PGVectorStore.initialize เพราะมันยืม connection ไว้ก่อนสร้างตาราง — ถ้าสร้างตารางล้ม connection ไม่ถูกคืน และ pool.end() ค้างตลอดไป
    const store = new PGVectorStore(embeddings, { pool, tableName });
    try {
      await store.ensureTableInDatabase(dimensions);
    } catch (err) {
      throw new Error(`สร้างตาราง "${tableName}" ไม่ได้: ${(err as Error).message} — ตรวจว่า Postgres มี extension pgvector (ใช้ image pgvector/pgvector) และชื่อตารางไม่ชนคำสงวนของ SQL`);
    }

    const { rows } = await pool.query<{ dims: number }>(
      `select a.atttypmod as dims from pg_attribute a join pg_class c on c.oid = a.attrelid
       where c.relname = $1 and a.attname = 'embedding' and c.relnamespace = 'public'::regnamespace`,
      [tableName],
    );
    const actual = rows[0]?.dims;
    if (actual !== undefined && actual !== dimensions) {
      throw new Error(
        `ตาราง "${tableName}" มีมิติ vector = ${actual} แต่ embedding ปัจจุบันเป็น ${dimensions} — ใช้ตารางใหม่ หรือ embed ข้อมูลทั้งหมดใหม่ด้วยโมเดลเดียวกัน (resetTable เพื่อล้างตาราง)`,
      );
    }
    return store;
  } catch (err) {
    if (!opts.pool) await pool.end();
    throw err;
  }
}

/** ลบตาราง (ใช้กับตัวอย่าง/เทสต์) — ตารางจะถูกสร้างใหม่เมื่อเรียก createPgVectorStore */
export async function resetTable(tableName: string, opts: { pool?: pg.Pool } = {}): Promise<void> {
  assertTableName(tableName);
  const pool = opts.pool ?? createPool();
  try {
    await pool.query(`drop table if exists ${tableName}`);
  } finally {
    if (!opts.pool) await pool.end();
  }
}

const hashContent = (text: string): string => createHash("sha256").update(text).digest("hex").slice(0, 16);

/**
 * ใส่/อัปเดตเอกสารแบบ idempotent: id คงที่ต่อ source+chunkIndex
 * - ไม่มีใน DB → เพิ่ม · เนื้อหาเปลี่ยน → แทนที่ · เนื้อหาเดิม → ข้าม (ไม่เสียโควตา embedding)
 * คืน id ของทุกเอกสารที่ส่งเข้ามา
 */
export async function upsertDocuments(store: PGVectorStore, docs: Document[]): Promise<string[]> {
  if (docs.length === 0) return [];
  const ids = docs.map(documentId);
  if (new Set(ids).size !== ids.length) throw new Error("มีเอกสารที่ id ซ้ำกันในชุดเดียวกัน (source + chunkIndex ซ้ำ)");

  const withHash = docs.map((d) => ({ ...d, metadata: { ...d.metadata, contentHash: hashContent(d.pageContent) } }));
  const { rows } = await store.pool.query<{ id: string; hash: string | null }>(
    `select id, metadata->>'contentHash' as hash from ${store.tableName} where id = any($1::uuid[])`,
    [ids],
  );
  const existing = new Map(rows.map((r) => [r.id, r.hash]));

  const changed = ids.filter((id, i) => existing.has(id) && existing.get(id) !== withHash[i].metadata.contentHash);
  const toAdd = ids.map((id, i) => ({ id, doc: withHash[i] })).filter(({ id }) => !existing.has(id) || changed.includes(id));
  if (toAdd.length) {
    // embed ก่อนแตะ DB: ถ้า provider ตอบว่าง/ไม่ครบ (เช่นโควตาเต็ม) จะไม่ลบแถวเก่าทิ้ง และ retryAsync จับข้อความนี้ได้
    const vectors = await store.embeddings.embedDocuments(toAdd.map((x) => x.doc.pageContent));
    if (vectors.length !== toAdd.length || vectors.some((v) => v.length === 0)) {
      throw new Error("embedding ของเอกสารว่างเปล่าหรือไม่ครบ (provider ตอบผิดปกติ — มักเกิดจากโควตา free tier เต็ม รอ ~1 นาทีแล้วลองใหม่)");
    }
    if (changed.length) await store.delete({ ids: changed });
    await store.addVectors(vectors, toAdd.map((x) => x.doc), { ids: toAdd.map((x) => x.id) });
  }
  return ids;
}

/** ลบทุก chunk ของไฟล์/แหล่งที่มานั้น (ใช้เมื่อไฟล์ถูกลบหรือจะ re-index ทั้งไฟล์) */
export async function deleteBySource(store: PGVectorStore, source: string): Promise<void> {
  await store.delete({ filter: { source } });
}
