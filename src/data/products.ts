/** ข้อมูลสินค้าจำลอง (mock) สำหรับ Part 09–11 — ไม่ใช่ฐานข้อมูลจริง */
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number; // บาท
  stock: number;
}

export const products: Product[] = [
  { id: "p01", name: "เสื้อยืดสีดำ", category: "clothing", price: 350, stock: 12 },
  { id: "p02", name: "กางเกงยีนส์", category: "clothing", price: 890, stock: 5 },
  { id: "p03", name: "Mechanical Keyboard", category: "electronics", price: 2490, stock: 3 },
  { id: "p04", name: "Laptop", category: "electronics", price: 32900, stock: 2 },
  { id: "p05", name: "Monitor 27 นิ้ว", category: "electronics", price: 6900, stock: 0 },
  { id: "p06", name: "หูฟังบลูทูธ", category: "electronics", price: 1290, stock: 8 },
  { id: "p07", name: "กระติกน้ำสแตนเลส", category: "home", price: 420, stock: 20 },
  { id: "p08", name: "กาแฟคั่วเข้ม 250g", category: "food", price: 250, stock: 15 },
];
