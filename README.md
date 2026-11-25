# LangChain.js — From Fundamentals to Production AI Agents

หลักสูตร 20 Part (6 Module) สอน LangChain.js (v1 modern API) ตั้งแต่พื้นฐาน LLM จนถึง AI Agent ระดับ production
สำหรับคนที่เขียน JavaScript/TypeScript และ async/await เป็นแล้ว ไม่ต้องมีพื้นฐาน Machine Learning

> **มือใหม่เริ่มที่ [`docs/start-here.md`](docs/start-here.md)** — เส้นทางเรียน สิ่งที่ต้องเตรียม และลำดับทำทีละ Part

## ติดตั้ง

ต้องใช้ Node.js 20 ขึ้นไป (ทดสอบกับ Node 26) และ [pnpm](https://pnpm.io/installation)

```bash
pnpm install
cp .env.example .env     # แล้วใส่ API key (TOKENME_API_KEY เป็นตัวหลัก)
pnpm play                # ดูวิธีใช้
```

## วิธีรันตัวอย่าง

```bash
pnpm play 4-1      # รัน examples/part-04/04-01-*.ts
pnpm play 04-01    # เหมือนกัน
```

- ทุกตัวอย่างรันแยกกันได้ ไม่ต้องเข้าใจโค้ดทั้ง repo
- อ่านเนื้อหาของแต่ละ Part ที่ `parts/NN-ชื่อ/README.md`
- Workshop อยู่ที่ `workshops/part-NN/` — เริ่มจาก `starter/` (โครงให้เติม) แล้วเทียบ `solution/` (เฉลย)
- เป้าหมายการเรียนและรายการตัวอย่างทั้งหมดอยู่ใน [`docs/course-outline.md`](docs/course-outline.md)

## Model ที่ใช้ในหลักสูตร

- **TokenMe** `deepseek-ai/deepseek-v4.1-flash-1017` (OpenAI-compatible gateway) — ตัวหลักที่ `createChatModel()` ใช้เป็นค่าเริ่มต้น
- **Groq** `openai/gpt-oss-20b` และ **DeepSeek** — ตัวเลือกสำรอง (`provider: "groq"` / `"deepseek"` หรือ `AI_PROVIDER`)
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
| 3 | 09–12 | Tools, Agent Loop, createAgent, Memory | Phase 2 ✅ (Part 09–12) |
| 4 | 13–16 | Documents, Embeddings, Vector Stores, RAG | Phase 2 ✅ (Part 13–16) |
| 5 | 17 | Agent Middleware & Human-in-the-Loop | ✅ |
| 5 | 18 | Testing, Debugging & Evaluation | ✅ |
| 5 | 19 | Backend Integration (NestJS) | ✅ |
| 6 | 20 | Capstone: AI Personal Task Manager | ✅ |

> หมายเหตุ: ทดสอบบน macOS/Linux เท่านั้น — `pnpm play` ยังไม่รองรับ Windows (ใช้ WSL)

## ตั้งค่าเพิ่มสำหรับ Phase 2 (Part 12–16)

```bash
cp .env.example .env     # ใส่ GROQ_API_KEY / DEEPSEEK_API_KEY / GOOGLE_API_KEY (embeddings) และ DATABASE_URL
pnpm db:up               # docker compose up -d --wait  (PostgreSQL 17 + pgvector, พอร์ต 5435)
pnpm db:down             # หยุด (ข้อมูลอยู่ใน volume; ลบด้วย docker compose down -v)
```

พอร์ตเริ่มต้นคือ **5435** (เลี่ยงชนกับ Postgres ตัวอื่นในเครื่อง) เปลี่ยนได้ด้วย `POSTGRES_PORT` และแก้ `DATABASE_URL` ให้ตรงกัน

## ตั้งค่าเพิ่มสำหรับ Phase 3 (Part 17–20)

- `LANGSMITH_API_KEY` (free plan พอ) ใช้ใน Part 18 — tracing ปิดเป็นค่าเริ่มต้น (`LANGSMITH_TRACING=false`) และเปิดเฉพาะตัวอย่างที่ต้องการ เพราะ free plan มี quota จำกัด
- `pnpm test` ไม่ส่ง trace เลย
- Part 19–20 ใช้ `apps/task-api` (NestJS + Prisma): ตั้ง `TASK_API_DATABASE_URL`, `JWT_SECRET` ใน `.env` แล้ว `pnpm db:up && pnpm --filter task-api db:create && pnpm --filter task-api migrate` ดู [`apps/task-api/README.md`](apps/task-api/README.md)

### รัน Capstone (Part 19–20)

```bash
pnpm db:up && pnpm --filter task-api db:create && pnpm --filter task-api migrate
pnpm app:api     # NestJS API  (PORT=3000; ชนพอร์ตให้ตั้ง PORT=3010)
pnpm app:web     # Next.js http://localhost:3001  (NEXT_PUBLIC_API_URL ชี้ไปที่ API)
```
`.env` ต้องมี `TASK_API_DATABASE_URL`, `JWT_SECRET`, key ของ model (`GROQ_API_KEY` หรือ `DEEPSEEK_API_KEY` + `AI_PROVIDER`) และ `GOOGLE_API_KEY` สำหรับ embeddings — ดูเนื้อหาและ checklist ที่ [`parts/20-capstone`](parts/20-capstone/README.md), สรุปผลที่ [`docs/phase-3-report.md`](docs/phase-3-report.md)

## คำสั่งสำหรับ repo

```bash
pnpm typecheck   # ตรวจ type ทั้ง repo
pnpm test        # รัน test (root)
pnpm app:api:test   # spec ของ task-api (ต้องมี DB)
pnpm app:web:test   # test ของ task-web
```
