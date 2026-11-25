# เริ่มที่นี่ — เส้นทางเรียนทีละขั้น

หลักสูตรนี้เรียงเป็น 20 Part เรียนตามลำดับ ข้ามไม่ได้เพราะแต่ละ Part ต่อยอดจากก่อนหน้า

## 1. เตรียมให้ครบก่อนเริ่ม (ครั้งเดียว)

| ต้องมี | ใช้ตั้งแต่ | วิธี |
|---|---|---|
| Node.js 20+ และ pnpm | Part 02 | `pnpm install` |
| `TOKENME_API_KEY` | Part 03 | `cp .env.example .env` แล้วใส่ key (provider หลัก) |
| `GROQ_API_KEY` (ฟรี, ไม่บังคับ) | Part 03, 06, 11 | ใช้เทียบ provider และเป็นตัวสำรอง |
| `DEEPSEEK_API_KEY` (ไม่บังคับ) | Part 03 | สำหรับสลับ provider |
| Docker | Part 12 | `pnpm db:up` (PostgreSQL + pgvector พอร์ต 5435) |
| `GOOGLE_API_KEY` (ฟรี) | Part 14 | Gemini embeddings |
| `LANGSMITH_API_KEY` (ฟรี) | Part 18 | tracing ปิดเป็นค่าเริ่มต้น |
| `TASK_API_DATABASE_URL`, `JWT_SECRET` | Part 19 | ดู `apps/task-api/README.md` |

เช็กว่าพร้อม: `pnpm play` ต้องแสดงรายการ Part, `pnpm typecheck` ต้องไม่มี error

## 2. วนทำทีละ Part

1. **อ่าน** `parts/NN-*/README.md`
2. **รัน** ตัวอย่างที่เนื้อหาอ้างถึง เช่น `pnpm play 4-1` แล้วเทียบผลกับที่เขียนไว้
3. **ลองแก้** ตัวอย่างเอง เปลี่ยนค่า ดูว่าผลเปลี่ยนอย่างไร
4. **ทำ workshop** ที่ `workshops/part-NN/README.md` เริ่มจาก `starter/` (มี `TODO` บอกทีละจุด)
5. **เทียบเฉลย** ที่ `solution/` หลังทำเสร็จหรือติดจริงๆ ไม่ใช่ตอนเริ่มติด

## 3. ลำดับทั้งหมด

| Module | Part | เรื่อง |
|---|---|---|
| 1 Foundation | 01–04 | LangChain คืออะไร · ตั้งโปรเจกต์ · Chat Model · Messages |
| 2 Building Blocks | 05–08 | Prompt · Structured Output · Runnable/LCEL · Streaming/Batch |
| 3 Agent | 09–12 | Tools · Agent Loop · createAgent · Memory (ต้องมี Docker) |
| 4 Knowledge & RAG | 13–16 | Documents · Embeddings · Vector Store · RAG (ต้องมี Gemini key) |
| 5 Production | 17–19 | Middleware + HITL · Testing/Evaluation · NestJS backend |
| 6 Capstone | 20 | AI Personal Task Manager (API + เว็บ) |

## 4. Part 19–20 เรียนต่างจากเดิม

ไม่มี `pnpm play` และไม่มี `starter/` แยก โค้ดคือแอปจริงใน `apps/`
- ดูทีละขั้นด้วย tag: `git tag -l 'part-19-*'` และ `git tag -l 'milestone-*'`
- รัน spec เพื่อพิสูจน์ว่าขั้นนั้นทำงาน: `pnpm --filter task-api test`
- Part 20 รัน: `pnpm app:api` กับ `pnpm app:web`

## 5. ติดปัญหา

- `pnpm play` บอกว่าไม่เจอ key → ตรวจ `.env` (ชื่อตัวแปรต้องตรงกับ `.env.example`)
- Groq โดน 429 → โควตารายวันหมด ใช้ TokenMe (ค่าเริ่มต้น) หรือ `AI_PROVIDER=deepseek`
- ต่อ Postgres ไม่ได้ → `pnpm db:up` แล้วเช็กว่าพอร์ต 5435 ว่าง
- สูตรลัด: [`docs/cheatsheet.md`](cheatsheet.md) · เป้าหมายแต่ละ Part: [`docs/course-outline.md`](course-outline.md)
