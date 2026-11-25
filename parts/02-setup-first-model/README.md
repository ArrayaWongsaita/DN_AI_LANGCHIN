# Part 02 — Project Setup & First Chat Model

ระดับ: Beginner · เวลา: 60–90 นาที · ตัวอย่าง: `examples/part-02/` · Workshop: `workshops/part-02/`

## 1. Introduction

Part นี้พาตั้งโปรเจกต์ TypeScript แบบเดียวกับ repo นี้ตั้งแต่ศูนย์ และเรียก Chat Model เป็นครั้งแรก
**ทำไมสำคัญ:** ถ้าตั้งค่าผิด (ESM, env, API key) ทุก Part ถัดไปจะรันไม่ได้ และ API key ที่รั่วไหลคือความเสี่ยงจริง
**ปัญหา:** การเรียก model ผ่านเครือข่ายล้มเหลวได้หลายแบบ เราต้องรู้ว่าแต่ละแบบหมายถึงอะไร

## 2. Learning Objectives

ผู้เรียนจะ **เข้าใจ** บทบาทของ Node, pnpm, TypeScript, ESM, tsx และ package ต่างๆ ของ LangChain
และจะ **ทำได้**: สร้างโปรเจกต์, จัดการ `.env`, สร้าง Chat Model ด้วย `initChatModel()`, เรียก `invoke()`, อ่าน `AIMessage`, ดักจับ error พื้นฐาน

## 3. Concept Explanation

| เครื่องมือ | หน้าที่ |
|---|---|
| **Node.js** | runtime รัน JavaScript ฝั่ง server (ใช้ 20+) |
| **pnpm** | package manager (เร็ว ประหยัดพื้นที่) |
| **TypeScript** | JavaScript + type ตรวจข้อผิดพลาดก่อนรัน |
| **ESM** | ระบบ module แบบ `import`/`export` (ตั้ง `"type": "module"`) ทำให้ใช้ top-level `await` ได้ |
| **tsx** | รันไฟล์ `.ts` ตรงๆ ไม่ต้อง compile |
| **Environment Variable** | ค่าตั้งค่าที่อยู่นอกโค้ด เช่น API key (เก็บใน `.env`) |

### Packages ของ LangChain

| Package | หน้าที่ |
|---|---|
| `langchain` | ชั้นสูง: `initChatModel`, `createAgent`, middleware |
| `@langchain/core` | abstraction หลัก: messages, prompts, runnables, tools |
| `@langchain/openai`, `@langchain/groq`, `@langchain/deepseek`, … | integration ต่อ provider (ติดตั้งเฉพาะที่ใช้) — TokenMe ใช้รูปแบบเดียวกับ OpenAI จึงเรียกผ่าน `@langchain/openai` |
| `zod` | schema สำหรับ tool/structured output (Part 06+) |

### API Key

**Model Provider** = บริษัทที่ให้บริการ model (TokenMe, Groq, DeepSeek, OpenAI…) · **API Key** = รหัสลับระบุตัวตนของเรา
กฎเหล็ก: เก็บใน `.env`, ใส่ `.env` ใน `.gitignore`, ห้ามพิมพ์ key ลง log/แชต/commit

## 4. Problem Demonstration

ลองรัน `pnpm play 2-2` ตอนที่ยังไม่มี `.env` จะเห็น error เพราะไม่มี key
และลองคิดว่าถ้าเอา key ใส่ในโค้ดแล้ว `git push` จะเกิดอะไร — key ถูกเปิดเผยในประวัติ git ตลอดไป (ต้อง revoke ทิ้ง)
อีกปัญหา: ถ้าไม่ดักจับ error แอปจะ crash ทั้งตัวเมื่อ provider ล่มชั่วคราว

## 5. Solution

- ตั้งค่าโปรเจกต์ให้เป็นระบบ + `.env`/`.env.example`/`.gitignore`
- `initChatModel("ชื่อ model", { modelProvider })` สร้าง model ด้วย interface เดียวกันทุก provider
- gateway ที่ใช้รูปแบบเดียวกับ OpenAI (เช่น TokenMe): ใช้ `modelProvider: "openai"` แล้วชี้ `configuration: { baseURL }` ไปที่ gateway นั้น
- `try/catch` + แยกประเภท error จาก HTTP status

## 6. Visual Explanation

```mermaid
flowchart LR
  ENV[".env<br/>TOKENME_API_KEY=…"] -->|process.env| CODE["ไฟล์ .ts"]
  CODE -->|initChatModel| MODEL["Chat Model instance"]
  MODEL -->|invoke(prompt)| API["Provider API (TokenMe)"]
  API -->|AIMessage| CODE
```

โครงโปรเจกต์ (ของ repo นี้):

```
.
├── src/            # โค้ดที่ใช้ซ้ำ (models/, utils/, …)
├── examples/       # ตัวอย่างรายไฟล์ part-NN/
├── scripts/        # playground.ts (pnpm play)
├── .env            # key จริง (ไม่ commit)
├── .env.example    # แม่แบบ (commit ได้)
├── .gitignore      # ต้องมี .env
├── package.json    # "type": "module"
└── tsconfig.json
```

## 7. Coding Examples

### ตั้งโปรเจกต์ใหม่ของคุณเอง (ทำตามเมื่ออยากเริ่มจากศูนย์)

```bash
mkdir my-langchain && cd my-langchain
pnpm init
pnpm add langchain @langchain/core @langchain/openai zod
pnpm add -D typescript tsx @types/node
```

`package.json` ต้องมี `"type": "module"` และ script เช่น `"play": "tsx --env-file=.env src/index.ts"`
`tsconfig.json` ที่ใช้ใน repo นี้: `target ES2022`, `module/moduleResolution NodeNext`, `strict: true`

> หมายเหตุ pnpm เวอร์ชันใหม่: ถ้าติดตั้ง `esbuild` แล้วเจอ `Ignored build scripts` ให้รัน `pnpm approve-builds esbuild`

### 02-01 Hello TypeScript — ตรวจว่า TS + ESM + tsx ทำงาน
```
สวัสดี นักพัฒนา ยินดีต้อนรับสู่ LangChain.js
Node.js: v26.13.1
```

### 02-02 Read Environment Variables — อ่าน key โดยไม่เปิดเผยค่า
```
TOKENME_API_KEY: ตั้งค่าแล้ว (ยาว 64 ตัวอักษร)
GROQ_API_KEY: ตั้งค่าแล้ว (ยาว 56 ตัวอักษร)
DEEPSEEK_API_KEY: ตั้งค่าแล้ว (ยาว 35 ตัวอักษร)
GOOGLE_API_KEY: ตั้งค่าแล้ว (ยาว 53 ตัวอักษร)

requireEnv('TOKENME_API_KEY') ผ่าน — ได้ค่ามาแล้ว (ไม่แสดงค่า, ยาว 64 ตัวอักษร)
```

### 02-03 Initialize Chat Model — สร้าง instance (ยังไม่เรียก API)
```
สร้าง model สำเร็จ
ประเภท: ConfigurableModel
มี method invoke: true
```

### 02-04 First Model Invocation — เรียกครั้งแรก
Input: ข้อความ · Process: `await model.invoke(...)` · Output: `AIMessage` (ย่อ)
```
กำลังเรียก model...
AIMessage {
  "content": "ฉันเป็นผู้ช่วย AI ที่พร้อมให้ข้อมูลและช่วยงานคุณอย่างกระชับและเป็นกันเอง",
  "response_metadata": { "finish_reason": "stop", "model_name": "deepseek-ai/deepseek-v4.1-flash-1017", … },
  "tool_calls": [],
  "usage_metadata": { "input_tokens": 46, "output_tokens": 137, "total_tokens": 183, "output_token_details": { "reasoning": 114 } }
}
```
สังเกต: output token มากกว่าคำตอบที่เห็นเพราะโมเดลเป็น reasoning model — token ที่ใช้ "คิด" ก่อนตอบ (`reasoning`) ถูกนับรวมด้วย

### 02-05 Read AI Response — อ่านแต่ละส่วนของ AIMessage
```
ชนิดของ content: string
content: ดอยอินทนนท์ จังหวัดเชียงใหม่ สูงประมาณ 2,565 เมตร
usage_metadata: {
  output_tokens: 69,
  input_tokens: 44,
  total_tokens: 113,
  input_token_details: { audio: undefined, cache_read: 0 },
  output_token_details: { audio: undefined, reasoning: 45 }
}
finish_reason: stop
model: deepseek-ai/deepseek-v4.1-flash-1017
```
(ชื่อ field ของชื่อ model ต่างกันตาม provider — `model_name` กับ TokenMe, `model` กับ Groq — จึงอ่านทั้งสองแบบ)

### 02-06 Basic Error Handling — ทำให้พังจริง 3 แบบ + จำลอง 2 แบบ
```
[API key ผิด] ❌ API key ไม่ถูกต้อง (401) — ตรวจ .env
[ชื่อ model ผิด] ❌ Model name หรือ request ไม่ถูกต้อง (404) — ตรวจชื่อ model
[เครือข่ายล้มเหลว] ❌ เชื่อมต่อเครือข่ายไม่ได้ — ตรวจอินเทอร์เน็ต/base URL
[Rate limit] ❌ เรียกถี่เกินไป (429 rate limit) — รอแล้วลองใหม่ (retry + backoff)
[ยอดเงินไม่พอ] ❌ ยอดเงิน/โควตาไม่พอ (402) — เติมเงินหรือเปลี่ยน provider
```
(429 และ 402 เป็นการจำลอง เพราะทำซ้ำได้ยากและอาจเสียเงิน — ผลลัพธ์ที่เห็นตรวจกับ TokenMe `deepseek-ai/deepseek-v4.1-flash-1017`; ข้อความจาก LLM อาจต่างกันในแต่ละครั้ง)

## 8. Common Mistakes

| ข้อผิดพลาด | สาเหตุ | วิธีตรวจ/แก้ |
|---|---|---|
| `Cannot use import statement outside a module` | ไม่มี `"type": "module"` | เพิ่มใน `package.json` |
| `Missing env var TOKENME_API_KEY` | ไม่มี `.env` หรือชื่อผิด | `cp .env.example .env`, เช็กการสะกด, ไม่มีเว้นวรรครอบ `=` |
| ลืม `await` แล้วได้ `Promise { <pending> }` | `invoke` เป็น async | ใส่ `await` |
| 401 | key ผิด/หมดอายุ/มีช่องว่างปน | สร้าง key ใหม่ |
| 404 ที่ model | ชื่อ model ผิด | เทียบกับรายชื่อของ provider |
| `Ignored build scripts: esbuild` (pnpm ใหม่) | pnpm บล็อก postinstall | `pnpm approve-builds esbuild` |
| commit `.env` ไปแล้ว | ลืม `.gitignore` | revoke key ทันที (ลบจาก git ไม่พอ) |

## 9. Best Practices

- **Security:** `.env` ใน `.gitignore`; commit แค่ `.env.example`; ไม่ log ค่า key
- **Readability:** ใช้ `requireEnv()` ให้ error บอกชื่อตัวแปรที่ขาด
- **Maintainability:** อย่า hardcode ชื่อ model ทุกที่ — Part 03 จะรวมเป็น config เดียว
- **Cost/Performance:** ตั้ง `maxRetries`/`timeout` ให้เหมาะ; เรียกเท่าที่จำเป็น
- ดักจับ error ที่ขอบของแอป (จุดที่เรียก model) แล้วแสดงข้อความที่ผู้ใช้เข้าใจ

## 10. Exercises

**Basic:** รัน 02-05 แล้วเปลี่ยนคำถาม สังเกต `usage_metadata`
**Intermediate:** แก้ 02-06 เพิ่มกรณี timeout (ตั้ง `timeout: 1` ms) และอธิบายผล
**Challenge:** เขียนฟังก์ชัน `invokeWithRetry(model, prompt, retries)` ที่ลองใหม่เมื่อเจอ 429/5xx เท่านั้น (ไม่ retry 401/404)

## 11. Workshop

ดู [`workshops/part-02/README.md`](../../workshops/part-02/README.md) — AI Hello World ใน Terminal

## 12. Summary

- ESM + tsx + `.env` คือฐานของทุกตัวอย่าง
- `initChatModel(name, { modelProvider, apiKey })` → `model.invoke(text)` → `AIMessage`
- ส่วนสำคัญของ `AIMessage`: `content`, `usage_metadata`, `response_metadata`
- แยกประเภท error จาก HTTP status: 401 key, 404/400 model/request, 402 ยอดเงิน, 429 rate limit, 5xx provider
- API ที่ใช้: `initChatModel`, `invoke`, `try/catch`

## 13. Knowledge Check

1. (Concept) ทำไมต้องใส่ `.env` ใน `.gitignore` แต่ commit `.env.example` ได้?
2. (Concept) ทำไม `invoke()` ต้องใช้ `await`?
3. (Code reading) ใน 02-06 ทำไมตั้ง `maxRetries: 0`? ถ้าไม่ตั้งจะเห็นอะไรต่างไป?
4. (Practical) เจอ HTTP 429 ควรทำอะไร และเจอ 401 ควรทำอะไรต่างกันอย่างไร?
5. (Practical) `response.content` ควรใช้ตรงๆ เป็น string เสมอหรือไม่ เพราะอะไร?

## 14. Next Part

Part 03 ลงลึกที่ Chat Model: การตั้งค่า (temperature, max tokens, timeout), อ่าน metadata/token usage, เปรียบเทียบและสลับ provider
