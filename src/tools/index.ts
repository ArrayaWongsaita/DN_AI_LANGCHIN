import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { products } from "../data/products.js";

const numbers = z.object({ a: z.number().describe("ตัวเลขตัวแรก"), b: z.number().describe("ตัวเลขตัวที่สอง") });

export const add = tool(async ({ a, b }) => String(a + b), {
  name: "add",
  description: "บวกเลขสองจำนวน",
  schema: numbers,
});

export const subtract = tool(async ({ a, b }) => String(a - b), {
  name: "subtract",
  description: "ลบเลข: a ลบ b",
  schema: numbers,
});

export const multiply = tool(async ({ a, b }) => String(a * b), {
  name: "multiply",
  description: "คูณเลขสองจำนวน",
  schema: numbers,
});

// ข้อมูลอากาศจำลอง
const weather: Record<string, string> = {
  กรุงเทพ: "ร้อน 34°C มีเมฆบางส่วน",
  เชียงใหม่: "อากาศดี 28°C ท้องฟ้าโปร่ง",
  ภูเก็ต: "ฝนตกเล็กน้อย 30°C",
};

export const getWeather = tool(
  async ({ city }) => {
    const key = Object.keys(weather).find((c) => city.includes(c));
    return key ? `สภาพอากาศ${key}: ${weather[key]}` : `ไม่พบข้อมูลเมือง "${city}" (มีเฉพาะ ${Object.keys(weather).join(", ")})`;
  },
  {
    name: "getWeather",
    description: "ดูสภาพอากาศปัจจุบันของเมือง (ข้อมูลจำลอง)",
    schema: z.object({ city: z.string().min(1).describe("ชื่อเมืองภาษาไทย เช่น เชียงใหม่") }),
  },
);

export const searchProduct = tool(
  async ({ query }) => {
    const q = query.toLowerCase();
    const found = products.filter((p) => p.name.toLowerCase().includes(q));
    if (found.length === 0) return `ไม่พบสินค้าที่ตรงกับ "${query}"`;
    return found.map((p) => `${p.name} ราคา ${p.price} บาท (เหลือ ${p.stock} ชิ้น)`).join("\n");
  },
  {
    name: "searchProduct",
    description: "ค้นหาสินค้าตามชื่อ คืนราคาและจำนวนคงเหลือ",
    schema: z.object({ query: z.string().min(1).describe("คำค้นหา เช่น keyboard") }),
  },
);

export const getCurrentDate = tool(async () => new Date().toISOString().slice(0, 10), {
  name: "getCurrentDate",
  description: "วันที่ปัจจุบันรูปแบบ YYYY-MM-DD",
  schema: z.object({}),
});

export const workshopTools = [add, subtract, multiply, getWeather, searchProduct, getCurrentDate];
