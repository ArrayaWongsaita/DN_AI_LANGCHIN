# task-api — AI Task Manager backend (NestJS + Prisma + PostgreSQL)

แอป backend ที่ใช้ร่วมกันใน **Part 19** (ทีละโมดูล `19-01 … 19-15`) และ **Part 20** (capstone) — เนื้อหาสอนอยู่ที่ `parts/19-backend-integration/README.md`

## เริ่มใช้งาน
```bash
pnpm install                          # ที่ root (ติดตั้งทั้ง workspace + generate Prisma client)
pnpm db:up                            # PostgreSQL + pgvector (Docker)
pnpm --filter task-api db:create      # สร้างฐานข้อมูล task_api (ครั้งแรก)
pnpm --filter task-api migrate        # สร้างตารางด้วย Prisma migration
pnpm --filter task-api test           # spec ทั้งหมด (ใช้ฐานข้อมูลจริง + model ปลอม ไม่เรียก API)
pnpm --filter task-api start          # เริ่มเซิร์ฟเวอร์ (PORT=3000)
```
env ที่ใช้ (ใน `.env` ของ root): `TASK_API_DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY` / `DEEPSEEK_API_KEY` (`AI_PROVIDER=groq|deepseek`)
ไม่มีฐานข้อมูล → spec ที่ใช้ DB ถูก **ข้าม** พร้อมข้อความบอกวิธีแก้

## โครงสร้าง (แยกหน้าที่ตามชั้น)
```
src/
├── config/        โหลด + ตรวจ env ครั้งเดียว (zod)                      19-01
├── prisma/        PrismaService (Prisma 7 + driver adapter pg)           19-06
├── tasks/         schemas (zod) · repository · service (กฎธุรกิจ)         19-05, 19-06
├── ai/            model.provider · task-tools (adapter) · agent.service
│                  · chat.controller · ai.module                           19-01 … 19-04
├── common/        guard ชั่วคราว (dev user) — จะถูกแทนด้วย JWT ใน 19-07
├── shared/        โค้ดที่ copy มาจาก root `src/` (แอปนี้พึ่งตัวเองได้)
└── generated/     Prisma client (ไม่ commit — สร้างจาก `pnpm generate`)
```

## หลักการที่ใช้ทั้งแอป
- **ทุก method ของ `TasksService` รับ `userId` เป็นพารามิเตอร์แรก** และ repository ใส่ `userId` ใน `where` ทุก query — งานของคนอื่นตอบ 404 (ไม่บอกว่ามีอยู่)
- **`userId` ของ agent มาจาก runtime context ที่ backend สร้าง** ไม่ใช่จาก model — schema ของ tool ไม่มีฟิลด์ `userId` (spec พิสูจน์ว่า model ส่ง `userId` ของคนอื่นมาก็ไม่มีผล)
- Nest ใช้ `@Inject(Token)` แบบระบุชัดทุกที่ เพราะ `tsx`/`vitest` ไม่ emit `design:paramtypes` (ไม่มี `emitDecoratorMetadata`) — ไม่ต้องพึ่ง reflection
- validation ด้วย Zod (ไม่ใช้ class-validator) ให้ schema ตัวเดียวใช้ทั้ง REST และ tool

## โมดูลของ Part 19
| โมดูล | อะไร | ไฟล์หลัก | tag |
|---|---|---|---|
| 19-01 | NestJS AI Module | `ai/ai.module.ts` | `part-19-01` |
| 19-02 | Chat Model Provider | `ai/model.provider.ts` (`CHAT_MODEL`, เลือก provider จาก env) | `part-19-02` |
| 19-03 | Agent Service | `ai/agent.service.ts` (`run()`, thread id ผูก userId) | `part-19-03` |
| 19-04 | Chat Controller | `ai/chat.controller.ts` (`POST /chat`, zod, 400/401) | `part-19-04` |
| 19-05 | Tool calls → Business Service | `ai/task-tools.ts` → `tasks/tasks.service.ts` | `part-19-05` |
| 19-06 | Prisma Integration | `prisma/`, `tasks/tasks.repository.ts`, `prisma/schema.prisma` | `part-19-06` |
| 19-07 | User-scoped tools + JWT auth | `auth/`, `ai/task-tools.ts` (tool ไม่มีฟิลด์ userId) | `part-19-07` |
| 19-08 | Runtime Context | `ai/runtime-context.ts` (สร้างจากผู้ใช้ที่ตรวจแล้วเท่านั้น) | `part-19-08` |
| 19-09 | Conversation API | `conversations/` (ประวัติอ่านจาก checkpointer, ตรวจเจ้าของ → 404) | `part-19-09` |
| 19-10 | SSE streaming | `conversations/conversation-chat.controller.ts` (`token/tool_start/tool_end/approval_required/done/error`, ตัดสายแล้วหยุดงาน) | `part-19-10` |
| 19-11 | Approval endpoint | `conversations/approvals.service.ts`, `ai/approval.middleware.ts` (idempotent, recheck, audit) | `part-19-11` |

**ข้อจำกัดที่ต้องรู้:** checkpointer เป็น `MemorySaver` (ในหน่วยความจำ — รีสตาร์ทแล้วประวัติ/คำขออนุมัติที่ค้างหาย; Part 19 ต่อไปจะเปลี่ยนเป็น Postgres) · token อายุ 15 นาที ยังไม่มี refresh token
`bash scripts/smoke.sh` = ทดสอบจริงกับ model (ต้องมี key และ DB)
| 19-12 | MCP server (stdio, read-only) | `mcp/task-mcp-server.ts` | `part-19-12` |
| 19-13 | MCP client adapter + untrusted data | `mcp/mcp-tools.ts`, `ai/untrusted.middleware.ts` | `part-19-13` |
| 19-14 | Rate limit + error mapping | `common/rate-limit*.ts`, `common/public-error.ts`, `common/http-exception.filter.ts` | `part-19-14` |
| 19-15 | Usage logging | `usage/` | `part-19-15` |

env เพิ่ม: `AI_PROVIDER` · `MCP_ENABLED=true` (เปิด MCP tools) · `RATE_LIMIT_PER_MIN` (ค่าเริ่มต้น 20)
