# LangChain.js — From Fundamentals to Production AI Agents

หลักสูตร 20 Part (6 Module) สอน LangChain.js (v1 modern API) ตั้งแต่พื้นฐาน LLM จนถึง AI Agent ระดับ production
สำหรับคนที่เขียน JavaScript/TypeScript และ async/await เป็นแล้ว ไม่ต้องมีพื้นฐาน Machine Learning

## ติดตั้ง

ต้องใช้ Node.js 20 ขึ้นไป (ทดสอบกับ Node 26) และ [pnpm](https://pnpm.io/installation)

```bash
pnpm install
cp .env.example .env     # แล้วใส่ API key (GROQ_API_KEY เป็นตัวหลัก, ฟรี)
pnpm play                # ดูวิธีใช้
```

## วิธีรันตัวอย่าง

```bash
pnpm play 4-1      # รัน examples/part-04/04-01-*.ts
pnpm play 04-01    # เหมือนกัน
```

- ทุกตัวอย่างรันแยกกันได้ ไม่ต้องเข้าใจโค้ดทั้ง repo
- อ่านเนื้อหาของแต่ละ Part ที่ `parts/NN-ชื่อ/README.md`
- Workshop และเฉลยอยู่ที่ `workshops/part-NN/`
- เป้าหมายการเรียนและรายการตัวอย่างทั้งหมดอยู่ใน [`docs/course-outline.md`](docs/course-outline.md)

## Model ที่ใช้ในหลักสูตร

- **Groq** `openai/gpt-oss-20b` (free tier) — ตัวหลัก
- **DeepSeek** — provider ตัวที่สอง (ใช้สาธิตการสลับ provider)
- **Google Gemini embeddings** — ใช้ใน Part 14–16 (Phase 2)

## สถานะ

| Module | Part | หัวข้อ | สถานะ |
|---|---|---|---|
| 1 | 01 | Introduction to LangChain | ✅ |
| 1 | 02 | Project Setup & First Chat Model | ✅ |
| 1 | 03 | Chat Models & Model Configuration | ✅ |
| 1 | 04 | Messages & Conversation | ✅ |
| 2 | 05 | Prompt Engineering & Prompt Templates | ✅ |
| 2 | 06 | Structured Output & Zod Schema | ✅ |
| 2 | 07 | Runnables & LCEL | ✅ |
| 2 | 08 | Streaming, Batch & Concurrency | ✅ |
| 3 | 09–12 | Tools, Agent Loop, createAgent, Memory | Phase 2 |
| 4 | 13–16 | Documents, Embeddings, Vector Stores, RAG | Phase 2 |
| 5 | 17–19 | Middleware & HITL, Testing, Backend | Phase 3 |
| 6 | 20 | Capstone: AI Personal Task Manager | Phase 3 |

> หมายเหตุ: ทดสอบบน macOS/Linux เท่านั้น — `pnpm play` ยังไม่รองรับ Windows (ใช้ WSL)

## คำสั่งสำหรับ repo

```bash
pnpm typecheck   # ตรวจ type ทั้ง repo
pnpm test        # รัน test
```
