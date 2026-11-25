// 12-09: Trim Conversation
// ปัญหา: history ยาวขึ้นเรื่อยๆ → token/ค่าใช้จ่ายพุ่ง; ตัดแล้วต้องไม่ทิ้ง ToolMessage "กำพร้า" (ไม่มี AIMessage ที่ขอ tool)
import { AIMessage, HumanMessage, ToolMessage, trimMessages, type BaseMessage } from "langchain";

const history: BaseMessage[] = [
  new HumanMessage("ราคา Laptop เท่าไร"),
  new AIMessage({ content: "", tool_calls: [{ name: "searchProduct", args: { q: "Laptop" }, id: "t1", type: "tool_call" }] }),
  new ToolMessage({ content: "Laptop 32900 บาท", tool_call_id: "t1" }),
  new AIMessage("Laptop ราคา 32,900 บาท"),
  new HumanMessage("แล้วเมาส์ล่ะ"),
  new AIMessage({ content: "", tool_calls: [{ name: "searchProduct", args: { q: "เมาส์" }, id: "t2", type: "tool_call" }] }),
  new ToolMessage({ content: "เมาส์ 590 บาท", tool_call_id: "t2" }),
  new AIMessage("เมาส์ราคา 590 บาท"),
  new HumanMessage("ขอบคุณ"),
];

const show = (label: string, ms: BaseMessage[]) => console.log(`${label}: ${ms.map((m) => m.getType()).join(" → ")}`);
show("เดิม      ", history);

// ตัดแบบนับจำนวนข้อความดื้อๆ (เขียนง่ายแต่ผิด): slice(-7) บังเอิญเริ่มที่ tool → ToolMessage กำพร้า provider จะตอบ 400
const naive = history.slice(-7);
show("slice(-7) ", naive);

// ตัดอย่างถูกต้อง: เริ่มที่ human เสมอ, จบที่ human/tool
const trimmed = await trimMessages(history, {
  maxTokens: 5,
  tokenCounter: (ms) => ms.length,
  strategy: "last",
  startOn: "human",
  endOn: ["human", "tool"],
});
show("trimMessages", trimmed);

const hasOrphan = (ms: BaseMessage[]) => ms.some((m, i) => m.getType() === "tool" && !ms.slice(0, i).some((p) => p.getType() === "ai" && (p as AIMessage).tool_calls?.some((c) => c.id === (m as ToolMessage).tool_call_id)));
console.log("slice(-7)    มี ToolMessage กำพร้า:", hasOrphan(naive));
console.log("trimMessages มี ToolMessage กำพร้า:", hasOrphan(trimmed));
