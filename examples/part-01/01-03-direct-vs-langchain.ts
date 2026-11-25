// 01-03: Direct API vs LangChain Concept
// แนวคิด: ทำงานเดียวกัน (ถามคำถาม) กับหลาย provider
//   - แบบ Direct API: ต้องรู้ URL / key / รูปแบบของแต่ละ provider เอง
//   - แบบ LangChain: เปลี่ยนแค่ชื่อ provider
import { createChatModel, type ProviderName } from "../../src/models/index.js";
import { requireEnv } from "../../src/utils/env.js";
import { messageText } from "../../src/utils/text.js";

const question = "บอกชื่อเมืองหลวงของไทย สั้นๆ";

// ---------- แบบ Direct API: ต้องเขียนแยกต่อ provider ----------
const ENDPOINTS = {
  tokenme: { url: "https://api.tokenme.limited/api/v1/chat/completions", model: "deepseek-ai/deepseek-v4.1-flash-1017", key: "TOKENME_API_KEY" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", model: "openai/gpt-oss-20b", key: "GROQ_API_KEY" },
  deepseek: { url: "https://api.deepseek.com/chat/completions", model: "deepseek-flash", key: "DEEPSEEK_API_KEY" },
} as const;

async function askDirect(provider: ProviderName): Promise<string> {
  const { url, model, key } = ENDPOINTS[provider];
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${requireEnv(key)}` },
    body: JSON.stringify({ model, max_tokens: 400, messages: [{ role: "user", content: question }] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

// ---------- แบบ LangChain: interface เดียวกันทุก provider ----------
async function askLangChain(provider: ProviderName): Promise<string> {
  const model = await createChatModel({ provider, maxTokens: 400 });
  return messageText(await model.invoke(question));
}

for (const provider of ["tokenme", "groq", "deepseek"] as const) {
  console.log(`\n=== ${provider} ===`);
  try {
    console.log("Direct   :", await askDirect(provider));
    console.log("LangChain:", await askLangChain(provider));
  } catch (err) {
    console.log("ข้าม:", (err as Error).message.slice(0, 100)); // เช่น ยังไม่ได้ตั้ง key ของ provider นั้น
  }
}

// ข้อสังเกต: provider สองเจ้านี้ใช้รูปแบบ OpenAI-compatible จึงยังคล้ายกัน
// แต่ provider อื่น (Anthropic, Google) มี request/response format ต่างกันมาก
// และเรื่อง tool calling, streaming, structured output จะยิ่งต่างกัน → LangChain ซ่อนความต่างเหล่านี้
