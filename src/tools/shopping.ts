import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { products, type Product } from "../data/products.js";

/** หาสินค้าจากชื่อ: ตรงเป๊ะก่อน (ไม่สนตัวพิมพ์) ไม่งั้นต้องเป็นชื่อบางส่วนที่ตรง "ชิ้นเดียว" — ไม่เดาเมื่อกำกวม */
export function findProduct(name: string): Product {
  const q = name.trim().toLowerCase();
  const exact = products.find((p) => p.name.toLowerCase() === q);
  if (exact) return exact;
  const partial = products.filter((p) => p.name.toLowerCase().includes(q));
  if (partial.length === 0 || q === "") throw new Error(`ไม่พบสินค้า "${name}"`);
  if (partial.length > 1) throw new Error(`ชื่อ "${name}" ไม่ชัดเจน พบหลายรายการ: ${partial.map((p) => p.name).join(", ")}`);
  return partial[0];
}

export const searchProducts = tool(
  async ({ query }) => {
    const q = query.toLowerCase();
    const found = products.filter((p) => p.name.toLowerCase().includes(q) || p.category === q);
    return found.length
      ? found.map((p) => `${p.name} (${p.category}) ${p.price} บาท`).join("\n")
      : `ไม่พบสินค้าที่ตรงกับ "${query}" — สินค้าที่มีในร้าน: ${products.map((p) => p.name).join(", ")}`; // บอกรายชื่อที่มี ให้โมเดลลองค้นใหม่ได้
  },
  {
    name: "searchProducts",
    description: "ค้นหาสินค้าด้วยคำค้นหรือหมวดหมู่ (clothing, electronics, home, food) คืนรายชื่อพร้อมราคา ใช้คำตามที่ผู้ใช้พิมพ์ (ชื่อสินค้าในร้านมีทั้งไทยและอังกฤษ)",
    schema: z.object({ query: z.string().min(1).describe("คำค้นหา เช่น keyboard หรือ electronics") }),
  },
);

export const getPrice = tool(
  async ({ name }) => {
    const p = findProduct(name);
    return `${p.name} ราคา ${p.price} บาท`;
  },
  {
    name: "getPrice",
    description: "ดูราคาของสินค้าหนึ่งรายการ (ใช้ชื่อสินค้าที่ชัดเจน)",
    schema: z.object({ name: z.string().min(1).describe("ชื่อสินค้า") }),
  },
);

export const checkStock = tool(
  async ({ name }) => {
    const p = findProduct(name);
    return JSON.stringify({ name: p.name, stock: p.stock, inStock: p.stock > 0 });
  },
  {
    name: "checkStock",
    description: "ตรวจจำนวนคงเหลือของสินค้า คืน JSON { name, stock, inStock }",
    schema: z.object({ name: z.string().min(1).describe("ชื่อสินค้า") }),
  },
);

export const compareProducts = tool(
  async ({ names }) =>
    names
      .map(findProduct)
      .map((p) => `${p.name}: ${p.price} บาท, คงเหลือ ${p.stock}, หมวด ${p.category}`)
      .join("\n"),
  {
    name: "compareProducts",
    description: "เปรียบเทียบสินค้าตั้งแต่สองรายการขึ้นไป (ราคา คงเหลือ หมวดหมู่)",
    schema: z.object({ names: z.array(z.string().min(1)).min(2).describe("ชื่อสินค้าอย่างน้อย 2 รายการ") }),
  },
);

export const calculateTotal = tool(
  async ({ items }) => {
    const lines = items.map(({ name, quantity }) => {
      const p = findProduct(name);
      if (quantity > p.stock) throw new Error(`${p.name} คงเหลือ ${p.stock} ชิ้น ไม่พอสำหรับ ${quantity} ชิ้น`);
      return { name: p.name, quantity, unitPrice: p.price, subtotal: p.price * quantity };
    });
    return JSON.stringify({ lines, total: lines.reduce((s, l) => s + l.subtotal, 0) });
  },
  {
    name: "calculateTotal",
    description: "คำนวณยอดรวมของรายการสั่งซื้อ (ตรวจชื่อสินค้าและจำนวนคงเหลือให้) คืน JSON { lines, total }",
    schema: z.object({
      items: z
        .array(z.object({ name: z.string().min(1), quantity: z.number().int().min(1).describe("จำนวนชิ้น (จำนวนเต็ม ≥ 1)") }))
        .min(1)
        .describe("รายการสั่งซื้อ"),
    }),
  },
);

export const shoppingTools = [searchProducts, getPrice, checkStock, compareProducts, calculateTotal];
