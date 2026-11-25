// 01-02: Direct Model API Concept
// แนวคิด: ก่อนมี LangChain เราเรียก model ผ่าน HTTP API ตรงๆ ด้วย fetch
// ดูว่าเราต้องจัดการอะไรเองบ้าง: URL, header, รูปแบบ body, รูปแบบ response
import { requireEnv } from "../../src/utils/env.js";

const apiKey = requireEnv("GROQ_API_KEY");

// 1) เราต้องรู้ URL และรูปแบบ request ของ provider นี้เอง
const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "openai/gpt-oss-20b",
    // 2) เราต้องสร้างโครง messages เอง (role + content)
    messages: [{ role: "user", content: "อธิบาย LLM ใน 1 ประโยค" }],
  }),
});

// 3) เราต้องเช็ก HTTP error เอง
if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

// 4) เราต้องรู้ว่าคำตอบอยู่ตรง choices[0].message.content
const data = (await res.json()) as {
  choices: { message: { content: string }; finish_reason: string }[];
  usage: { total_tokens: number };
};
console.log("ANSWER:", data.choices[0].message.content);
console.log("FINISH:", data.choices[0].finish_reason, "| total tokens:", data.usage.total_tokens);
