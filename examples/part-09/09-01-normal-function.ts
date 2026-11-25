// 09-01: Normal TypeScript Function
// แนวคิด: ฟังก์ชันธรรมดาที่เราเขียนเอง — LLM "มองไม่เห็น" และเรียกไม่ได้ ต้องมีกลไก (tool) มาเชื่อม
function getWeather(city: string): string {
  const data: Record<string, string> = { เชียงใหม่: "28°C ท้องฟ้าโปร่ง", ภูเก็ต: "30°C ฝนตกเล็กน้อย" };
  return data[city] ?? "ไม่มีข้อมูล";
}

console.log("เราเรียกเองได้:", getWeather("เชียงใหม่"));
console.log("แต่ถ้าถาม LLM ตรงๆ มันไม่รู้ว่ามีฟังก์ชันนี้ และไม่มีข้อมูลอากาศปัจจุบัน → มันอาจเดาหรือบอกว่าไม่รู้");
console.log("→ tool = ฟังก์ชัน + ชื่อ + คำอธิบาย + schema ของ input เพื่อให้โมเดล 'ขอให้เราเรียก' ได้");
