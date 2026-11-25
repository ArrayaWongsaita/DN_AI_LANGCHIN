/** สินค้าตัวอย่างสำหรับ Part 14–15 (semantic search) — `text` คือคำอธิบายที่ใช้สร้าง embedding */
export interface SemanticProduct {
  id: string;
  name: string;
  category: "electronics" | "home" | "food" | "clothing" | "sports" | "stationery";
  text: string;
}

export const semanticProducts: SemanticProduct[] = [
  { id: "s01", name: "Laptop", category: "electronics", text: "Laptop โน้ตบุ๊กประสิทธิภาพสูง CPU 8 คอร์ แรม 16GB SSD 512GB สำหรับนักพัฒนาซอฟต์แวร์ เขียนโปรแกรมและคอมไพล์โค้ดได้ลื่น" },
  { id: "s02", name: "Mechanical Keyboard", category: "electronics", text: "Mechanical Keyboard คีย์บอร์ดแมคคานิคอล สวิตช์สัมผัสนุ่ม พิมพ์ลื่น ไฟ RGB สำหรับโปรแกรมเมอร์ที่เขียนโค้ดเป็นเวลานาน" },
  { id: "s03", name: "Monitor 27 นิ้ว", category: "electronics", text: "Monitor 27 นิ้ว จอภาพ 2K สำหรับนักพัฒนา เปิดโค้ดและเทอร์มินัลหลายหน้าต่างพร้อมกัน ถนอมสายตาเวลาเขียนโปรแกรมทั้งวัน" },
  { id: "s04", name: "Wireless Mouse", category: "electronics", text: "Wireless Mouse เมาส์ไร้สาย ตัวเล็ก จับถนัดมือ แบตเตอรี่ใช้งานได้ 6 เดือน ใช้ได้ทั้งงานเอกสารและเล่นเกม" },
  { id: "s05", name: "USB-C Hub", category: "electronics", text: "USB-C Hub ฮับต่อพ่วง 7 พอร์ต มี HDMI, USB 3.0 และช่องอ่านการ์ด สำหรับโน้ตบุ๊กที่มีพอร์ตน้อย" },
  { id: "s06", name: "Webcam Full HD", category: "electronics", text: "Webcam Full HD กล้องเว็บแคม 1080p ไมโครโฟนในตัว สำหรับประชุมออนไลน์" },
  { id: "s07", name: "หูฟังตัดเสียงรบกวน", category: "electronics", text: "หูฟังบลูทูธตัดเสียงรบกวน แบตเตอรี่ 30 ชั่วโมง ฟังเพลงและคุยโทรศัพท์ชัดเจน" },
  { id: "s08", name: "กระทะเทฟลอน", category: "home", text: "กระทะเทฟลอน 28 ซม. เคลือบผิวไม่ติด ใช้ได้กับเตาแก๊สและเตาไฟฟ้า ทำอาหารได้ทุกวัน" },
  { id: "s09", name: "เสื่อโยคะ", category: "sports", text: "เสื่อโยคะหนา 8 มม. กันลื่น พกพาสะดวก สำหรับออกกำลังกายและฝึกโยคะที่บ้าน" },
  { id: "s10", name: "กาแฟคั่วเข้ม 250g", category: "food", text: "เมล็ดกาแฟคั่วเข้ม 250 กรัม กลิ่นหอม รสเข้ม เหมาะกับการชงเอสเพรสโซ" },
  { id: "s11", name: "เสื้อยืดสีดำ", category: "clothing", text: "เสื้อยืดคอตตอน 100% สีดำ ใส่สบาย ระบายอากาศดี ใส่ได้ทุกวัน" },
  { id: "s12", name: "สมุดโน้ตปกแข็ง", category: "stationery", text: "สมุดโน้ตปกแข็ง A5 กระดาษ 100 แกรม เขียนด้วยปากกาหมึกซึมได้ ไม่ซึมทะลุหลังกระดาษ" },
  { id: "s13", name: "โคมไฟตั้งโต๊ะ LED", category: "home", text: "โคมไฟตั้งโต๊ะ LED ปรับความสว่างได้ 5 ระดับ แสงไม่กระพริบ ถนอมสายตาเวลาอ่านหนังสือ" },
  { id: "s14", name: "ร่มพับกันฝน", category: "clothing", text: "ร่มพับ 3 ตอน กันฝนและกัน UV น้ำหนักเบา พกใส่กระเป๋าได้" },
];
