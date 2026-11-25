function assertSameLength(a: number[], b: number[]) {
  if (a.length !== b.length) throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
}

/** ผลคูณจุด (dot product) */
export function dotProduct(a: number[], b: number[]): number {
  assertSameLength(a, b);
  return a.reduce((sum, x, i) => sum + x * b[i], 0);
}

/** cosine similarity: -1 (ตรงข้าม) … 0 (ไม่เกี่ยวกัน) … 1 (ทิศทางเดียวกัน); vector ศูนย์คืน 0 */
export function cosineSimilarity(a: number[], b: number[]): number {
  assertSameLength(a, b);
  const denom = Math.sqrt(dotProduct(a, a)) * Math.sqrt(dotProduct(b, b));
  return denom === 0 ? 0 : dotProduct(a, b) / denom;
}

/** ระยะทางแบบ Euclidean (ยิ่งน้อยยิ่งคล้าย) */
export function euclideanDistance(a: number[], b: number[]): number {
  assertSameLength(a, b);
  return Math.sqrt(a.reduce((sum, x, i) => sum + (x - b[i]) ** 2, 0));
}
