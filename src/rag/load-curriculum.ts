import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { JSONLoader } from "@langchain/classic/document_loaders/fs/json";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const DEFAULT_CURRICULUM_DIR = "data/curriculum";
const SUPPORTED = new Set([".txt", ".md", ".json", ".csv", ".pdf"]);

export interface LoadResult {
  documents: Document[];
  /** ไฟล์ที่ข้าม (ว่าง, ไม่รองรับ, อ่านไม่ได้) พร้อมเหตุผล — ไม่โยน exception */
  warnings: string[];
}

async function loadFile(path: string, ext: string): Promise<Document[]> {
  switch (ext) {
    case ".json":
      return new JSONLoader(path).load();
    case ".csv":
      return new CSVLoader(path).load(); // 1 แถว = 1 Document
    case ".pdf":
      return new PDFLoader(path).load(); // 1 หน้า = 1 Document
    default:
      return new TextLoader(path).load(); // .txt, .md
  }
}

/** โหลดไฟล์ที่รองรับทั้งหมดในโฟลเดอร์ (รวมโฟลเดอร์ย่อย) และใส่ metadata.source (path สัมพัทธ์) + metadata.type */
export async function loadCurriculum(dir: string = DEFAULT_CURRICULUM_DIR): Promise<LoadResult> {
  const documents: Document[] = [];
  const warnings: string[] = [];

  let files: string[];
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    files = entries.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name)).sort();
  } catch (err) {
    return { documents, warnings: [`อ่านโฟลเดอร์ ${dir} ไม่ได้: ${(err as Error).message}`] };
  }

  for (const file of files) {
    const source = relative(dir, file);
    const ext = extname(file).toLowerCase();
    if (!SUPPORTED.has(ext)) {
      warnings.push(`${source}: ข้าม (ไม่รองรับนามสกุล ${ext || "(ไม่มี)"})`);
      continue;
    }
    try {
      if (ext !== ".pdf" && !(await readFile(file, "utf8")).trim()) {
        warnings.push(`${source}: ข้าม (ไฟล์ว่าง)`);
        continue;
      }
      const loaded = (await loadFile(file, ext)).filter((d) => d.pageContent.trim());
      if (loaded.length === 0) {
        warnings.push(`${source}: ข้าม (ไม่มีเนื้อหา)`);
        continue;
      }
      for (const d of loaded) {
        documents.push(new Document({ pageContent: d.pageContent, metadata: { ...d.metadata, source, type: ext.slice(1) } }));
      }
    } catch (err) {
      warnings.push(`${source}: ข้าม (โหลดไม่สำเร็จ: ${(err as Error).message.split("\n")[0]})`);
    }
  }
  return { documents, warnings };
}

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

/** แบ่งเอกสารเป็นชิ้นด้วย RecursiveCharacterTextSplitter: คง metadata เดิม และเพิ่ม chunkIndex (นับแยกตาม source) */
export async function chunkDocuments(docs: Document[], opts: ChunkOptions = {}): Promise<Document[]> {
  const { chunkSize = 800, chunkOverlap = 100 } = opts;
  if (chunkOverlap >= chunkSize) throw new Error(`chunkOverlap (${chunkOverlap}) ต้องน้อยกว่า chunkSize (${chunkSize})`);
  if (docs.length === 0) return [];
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap, separators: ["\n\n", "\n", " ", ""] });
  const chunks = await splitter.splitDocuments(docs);
  const counters = new Map<string, number>();
  return chunks.map((c) => {
    const key = String(c.metadata.source ?? "");
    const chunkIndex = counters.get(key) ?? 0;
    counters.set(key, chunkIndex + 1);
    return new Document({ pageContent: c.pageContent, metadata: { ...c.metadata, chunkIndex } });
  });
}
