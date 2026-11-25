import { randomUUID } from "node:crypto";
import type { Embeddings } from "@langchain/core/embeddings";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { createEmbeddings } from "../shared/embeddings.js";

export const EMBEDDINGS = Symbol("EMBEDDINGS");
export const NOT_FOUND_ANSWER = "ไม่พบข้อมูลที่เกี่ยวข้องในเอกสาร";

/** ขนาด chunk 500 ตัวอักษร ซ้อนกัน 50 และทิ้ง chunk ที่สั้นกว่า 20 (หัวข้อเดี่ยวๆ ไม่มีสาระ) */
export const CHUNK_SIZE = 500;
export const CHUNK_OVERLAP = 50;
export const MIN_CHUNK_LENGTH = 20;
/** ระยะ cosine สูงสุดที่ยอมรับ — calibrate จากชุดเอกสารของ Part 16 (ตรงเรื่อง ≤ 0.28, นอกเรื่อง ≥ 0.43) ต้อง calibrate ใหม่กับข้อมูลจริงของคุณ */
export const MAX_DISTANCE = 0.35;
const MAX_CHUNKS_PER_DOCUMENT = 200;

export const UploadInput = z.object({
  title: z.string().trim().min(1, "ต้องระบุชื่อเอกสาร").max(200),
  filename: z.string().trim().min(1, "ต้องระบุชื่อไฟล์").max(200).regex(/\.(txt|md)$/i, "รองรับเฉพาะไฟล์ .txt และ .md"),
  content: z.string().refine((v) => v.trim().length > 0, "เนื้อหาว่าง").refine((v) => v.length <= 30_000, "เอกสารยาวเกิน 30,000 ตัวอักษร (เซิร์ฟเวอร์รับ body ไม่เกิน 100 KB)"),
});

export type KnowledgeHit = { content: string; title: string; source: string; chunk: number; distance: number };
export type KnowledgeSearchResult = { found: true; results: KnowledgeHit[] } | { found: false; answer: string };

/** Embeddings ที่สร้างตอนใช้งานจริงครั้งแรก (ไม่บังคับต้องมี GOOGLE_API_KEY ตอนเริ่มระบบ) */
export class LazyEmbeddings {
  private doc?: Embeddings;
  private query?: Embeddings;
  embedDocuments(texts: string[]) {
    return (this.doc ??= createEmbeddings("RETRIEVAL_DOCUMENT")).embedDocuments(texts);
  }
  embedQuery(text: string) {
    return (this.query ??= createEmbeddings("RETRIEVAL_QUERY")).embedQuery(text);
  }
}

const vectorLiteral = (v: number[]) => `[${v.join(",")}]`;

@Injectable()
export class KnowledgeService {
  private readonly splitter = new RecursiveCharacterTextSplitter({ chunkSize: CHUNK_SIZE, chunkOverlap: CHUNK_OVERLAP });

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EMBEDDINGS) private readonly embeddings: Pick<Embeddings, "embedDocuments" | "embedQuery">,
  ) {}

  async addDocument(userId: string, input: unknown) {
    const parsed = UploadInput.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues.map((i) => i.message).join("; "));
    const { title, filename, content } = parsed.data;
    const chunks = (await this.splitter.splitText(content)).map((c) => c.trim()).filter((c) => c.length >= MIN_CHUNK_LENGTH);
    if (chunks.length === 0) throw new BadRequestException("เนื้อหาสั้นเกินไปที่จะสร้างความรู้ได้");
    if (chunks.length > MAX_CHUNKS_PER_DOCUMENT) throw new BadRequestException(`เอกสารยาวเกินไป (เกิน ${MAX_CHUNKS_PER_DOCUMENT} ส่วน)`);

    const vectors = await this.embeddings.embedDocuments(chunks); // embed ก่อนเขียน DB: ถ้าล้มจะไม่มีเอกสารค้างครึ่งๆ กลางๆ
    const documentId = randomUUID();
    await this.prisma.$transaction([
      this.prisma.knowledgeDocument.create({ data: { id: documentId, userId, title, source: filename } }),
      ...chunks.map((text, i) =>
        this.prisma.$executeRaw`insert into "DocumentChunk" ("id", "documentId", "idx", "content", "embedding", "metadata")
          values (${randomUUID()}, ${documentId}, ${i}, ${text}, ${vectorLiteral(vectors[i]!)}::vector, ${JSON.stringify({ filename })}::jsonb)`,
      ),
    ]);
    return { id: documentId, title, source: filename, chunks: chunks.length };
  }

  list(userId: string) {
    return this.prisma.knowledgeDocument.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { _count: { select: { chunks: true } } } });
  }

  async remove(userId: string, id: string) {
    const { count } = await this.prisma.knowledgeDocument.deleteMany({ where: { id, userId } }).catch(() => ({ count: 0 }));
    if (count === 0) throw new NotFoundException("ไม่พบเอกสาร");
  }

  /** ค้นเฉพาะเอกสารของผู้ใช้ (join กับ userId) ผลที่ไกลกว่า MAX_DISTANCE ถูกตัดทิ้ง — ไม่เหลือ = NOT_FOUND โดยไม่เรียก LLM */
  async search(userId: string, query: string, k = 4): Promise<KnowledgeSearchResult> {
    const vec = vectorLiteral(await this.embeddings.embedQuery(query));
    const rows = await this.prisma.$queryRaw<{ content: string; title: string; source: string; idx: number; distance: number }[]>(Prisma.sql`
      select c."content", d."title", d."source", c."idx", (c."embedding" <=> ${vec}::vector)::float8 as distance
      from "DocumentChunk" c join "KnowledgeDocument" d on d."id" = c."documentId"
      where d."userId" = ${userId} and (c."embedding" <=> ${vec}::vector) <= ${MAX_DISTANCE}
      order by c."embedding" <=> ${vec}::vector limit ${k}`);
    if (rows.length === 0) return { found: false, answer: NOT_FOUND_ANSWER };
    return { found: true, results: rows.map((r) => ({ content: r.content, title: r.title, source: r.source, chunk: r.idx, distance: r.distance })) };
  }
}
