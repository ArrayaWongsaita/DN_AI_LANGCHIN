// Workshop 13 — STARTER (โครงให้เติม)
// อ่านโจทย์ที่ ../README.md ก่อน แล้วแทนที่ทุกจุดที่เขียน TODO — เสร็จแล้วค่อยเทียบกับ ../solution/
import type { Document } from "@langchain/core/documents";
import { loadCurriculum, chunkDocuments, type ChunkOptions } from "../../../src/rag/load-curriculum.js";

/** ทำความสะอาดข้อความก่อนแบ่ง: ตัด control char, ยุบช่องว่าง/tab, บรรทัดว่างติดกันไม่เกิน 1 บรรทัด */
export function cleanText(text: string): string {
  void text;
  throw new Error("TODO: ยังไม่ได้ทำ");
}

export interface SourceStats { source: string; type: string; documents: number; chunks: number; avgChunkLength: number; maxChunkLength: number }
export interface PipelineResult { chunks: Document[]; stats: SourceStats[]; warnings: string[] }

/** load → clean → split → สถิติต่อไฟล์ */
export async function processDocuments(dir: string, opts: ChunkOptions = {}): Promise<PipelineResult> {
  // TODO: loadCurriculum(dir) → cleanText ทุกเอกสาร → chunkDocuments → รวมสถิติต่อไฟล์ (warnings ส่งต่อมาด้วย)
  void [loadCurriculum, chunkDocuments, dir, opts];
  throw new Error("TODO: ยังไม่ได้ทำ");
}
