import type { Embeddings } from "@langchain/core/embeddings";

export type CountingEmbeddings = Embeddings & { documentsEmbedded: number; queriesEmbedded: number };

/** ห่อ Embeddings เพื่อนับจำนวนข้อความที่ถูกส่งไป embed (ไว้พิสูจน์ว่า re-index ไม่เสียโควตา) */
export function countingEmbeddings(inner: Embeddings): CountingEmbeddings {
  const wrapper = {
    documentsEmbedded: 0,
    queriesEmbedded: 0,
    async embedDocuments(texts: string[]) {
      wrapper.documentsEmbedded += texts.length;
      return inner.embedDocuments(texts);
    },
    async embedQuery(text: string) {
      wrapper.queriesEmbedded += 1;
      return inner.embedQuery(text);
    },
  };
  return wrapper as unknown as CountingEmbeddings;
}
