import { Document } from "@langchain/core/documents";
import { chunkDocuments, loadCurriculum, type ChunkOptions } from "../../../src/rag/load-curriculum.js";
import { isMain } from "../../../src/utils/is-main.js";

/** ทำความสะอาดข้อความก่อนแบ่ง: ตัด control char, ยุบช่องว่าง/tab, จำกัดบรรทัดว่างไม่เกิน 1 บรรทัด */
export function cleanText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface SourceStats {
  source: string;
  type: string;
  documents: number;
  chunks: number;
  avgChunkLength: number;
  maxChunkLength: number;
}

export interface PipelineResult {
  chunks: Document[];
  stats: SourceStats[];
  warnings: string[];
}

/** load → clean → split → สถิติต่อไฟล์ */
export async function processDocuments(dir: string, opts: ChunkOptions = {}): Promise<PipelineResult> {
  const { documents, warnings } = await loadCurriculum(dir);
  const cleaned = documents
    .map((d) => new Document({ pageContent: cleanText(d.pageContent), metadata: d.metadata }))
    .filter((d) => d.pageContent.length > 0);
  const chunks = await chunkDocuments(cleaned, opts);

  const bySource = new Map<string, { type: string; docs: Set<unknown>; lens: number[] }>();
  for (const c of chunks) {
    const key = c.metadata.source as string;
    const e = bySource.get(key) ?? { type: c.metadata.type as string, docs: new Set(), lens: [] };
    e.lens.push(c.pageContent.length);
    bySource.set(key, e);
  }
  const docCount = new Map<string, number>();
  for (const d of cleaned) docCount.set(d.metadata.source as string, (docCount.get(d.metadata.source as string) ?? 0) + 1);

  const stats = [...bySource].map(([source, e]) => ({
    source,
    type: e.type,
    documents: docCount.get(source) ?? 0,
    chunks: e.lens.length,
    avgChunkLength: Math.round(e.lens.reduce((a, b) => a + b, 0) / e.lens.length),
    maxChunkLength: Math.max(...e.lens),
  }));
  return { chunks, stats, warnings };
}

if (isMain(import.meta.url)) {
  const dir = process.argv[2] ?? "data/curriculum";
  const r = await processDocuments(dir, { chunkSize: 500, chunkOverlap: 50 });
  console.table(r.stats);
  console.log(`รวม ${r.chunks.length} chunk จาก ${r.stats.length} ไฟล์ | warnings: ${r.warnings.length ? r.warnings.join("; ") : "ไม่มี"}`);
}
