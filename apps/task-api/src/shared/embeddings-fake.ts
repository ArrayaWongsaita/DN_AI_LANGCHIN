import { createHash } from "node:crypto";
import { Embeddings } from "@langchain/core/embeddings";

/** vector ปลอมแบบ deterministic (hash ของข้อความ → ตัวเลข) ใช้ในเทสต์/ตัวอย่างออฟไลน์ ไม่มีความหมายเชิงภาษา */
class FakeEmbeddings extends Embeddings {
  constructor(private readonly dim: number) {
    super({});
  }

  private vector(text: string): number[] {
    const values: number[] = [];
    let block = 0;
    while (values.length < this.dim) {
      const digest = createHash("sha256").update(`${block++}:${text}`).digest();
      for (let i = 0; i + 1 < digest.length && values.length < this.dim; i += 2) {
        values.push(digest.readUInt16BE(i) / 65535 - 0.5);
      }
    }
    const norm = Math.sqrt(values.reduce((s, x) => s + x * x, 0)) || 1;
    return values.map((x) => x / norm);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.vector(t));
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.vector(text);
  }
}

export function createFakeEmbeddings(dim = 768): Embeddings {
  return new FakeEmbeddings(dim);
}
