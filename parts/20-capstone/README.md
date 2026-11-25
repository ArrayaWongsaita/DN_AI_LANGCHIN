# Part 20 — Capstone: AI Personal Task Manager

ระดับ: Advanced · เวลา: 4–6 ชั่วโมง · โค้ด: [`apps/task-api/`](../../apps/task-api/) (NestJS 12 + Prisma 7 + PostgreSQL/pgvector) และ [`apps/task-web/`](../../apps/task-web/) (Next.js 16 + React 19 + Tailwind 4) · tag `milestone-01` … `milestone-13`
Part นี้ไม่มี `pnpm play` — มันคือ "ประกอบทุกอย่างที่เรียนมาเป็นระบบเดียว" แต่ละ milestone มี spec/คำสั่งตรวจ และ git tag ให้ `git checkout` ย้อนดูสถานะได้
ผลลัพธ์ที่วางไว้บันทึกจากการรัน `scripts/capstone-demo.sh` บน TokenMe + Gemini embeddings จริง — LLM ตอบไม่เหมือนเดิมทุกครั้ง ตัวเลข token/ข้อความที่แสดงเป็นผลจากรันจริงครั้งหนึ่ง

## 1. Introduction

ถึงตรงนี้คุณมีชิ้นส่วนครบ: model, tool, agent, memory, RAG, middleware, HITL, backend, การทดสอบ Part นี้ถามว่า *"ถ้าส่งมอบให้คนใช้จริงหนึ่งคน ต้องมีอะไรอีก"* คำตอบคือไม่ใช่ฟีเจอร์ AI ใหม่ แต่คือ **รอยต่อ**: ตัวตนของผู้ใช้ไหลไปถึง tool ได้อย่างไร, ข้อมูลของใครอยู่ตรงไหน, อะไรหยุดไม่ให้ agent ลบของ, คำตอบมาจากเอกสารหรือเดา, และเรารู้ได้อย่างไรว่าการแก้ครั้งหน้าไม่ทำให้ของเดิมพัง

ผลิตภัณฑ์: ผู้จัดการงานที่สั่งด้วยภาษาไทยธรรมชาติ — "เพิ่มงานอ่านหนังสือ TypeScript พรุ่งนี้", "วันนี้มีงานอะไรครบกำหนด", "สรุปสัปดาห์นี้", "ลบงานประชุมทีม" (ต้องกดอนุมัติ), "ขั้นตอน deploy ของทีมคืออะไร" (ตอบจากเอกสารที่อัปโหลด พร้อมแหล่งที่มา)

## 2. Learning Objectives

- ประกอบ agent + backend + frontend เป็นแอปเดียวที่ทำงาน end-to-end
- ออกแบบ **trust boundary**: อะไรมาจาก token (เชื่อ), อะไรมาจาก model (ไม่เชื่อ), อะไรมาจากเอกสาร/tool result (ข้อมูล ไม่ใช่คำสั่ง)
- ใช้ pgvector + RAG ที่ "ไม่พบก็บอกว่าไม่พบ" โดยไม่เรียก LLM
- เขียนชุดประเมิน AI แบบ deterministic ที่พิสูจน์ว่าจับ guard ที่ถดถอยได้
- อ่านผลทดสอบเป็น *หลักฐาน* ไม่ใช่ความรู้สึก และรู้ว่าอะไรยังไม่ได้พิสูจน์

## 3. Concept Explanation

```
Browser (Next.js)            Backend (NestJS)                          Postgres
─────────────────            ────────────────                          ────────
login ─ JWT(15 นาที) ──────► JwtGuard ─ โหลด user จาก DB ─► RuntimeContext{userId,role,locale}
chat  ─ SSE ◄──────────────► ConversationChatController
                               └► AgentService (createAgent)
                                   middleware: toolError → logging → untrusted → dynamicPrompt
                                               → retry → modelLimit → toolLimit → summarization → approval
                                   tools (13) ─► TasksService / KnowledgeService ──► Prisma / pgvector
approve dialog ◄─ approval_required ─ Approval table (idempotent, recheck, audit)
```

**กฎสี่ข้อที่ทั้งระบบยึด**
1. *ตัวตนมาจาก token ที่ตรวจแล้วเท่านั้น* — schema ของ tool ไม่มีฟิลด์ `userId` ต่อให้ model ส่งมาก็ถูกทิ้ง
2. *Guard อยู่ในโค้ด ไม่ใช่ในพรอมต์* — การลบต้องผ่าน approval middleware + ตรวจสิทธิ์ซ้ำตอนทำจริง
3. *ข้อความจากภายนอกคือข้อมูล* — ผล `searchKnowledge`/MCP ถูกห่อ `<untrusted-data>` และตัวปิดแท็กถูกทำให้ใช้ไม่ได้
4. *ไม่รู้ = บอกว่าไม่รู้* — ค้นเอกสารแล้วไกลเกิน 0.35 → ตอบ "ไม่พบข้อมูลที่เกี่ยวข้องในเอกสาร" โดยไม่เรียก model

## 4. Problem Demonstration

สิ่งที่พบ **ตอนรันจริง** ซึ่ง spec ทั้ง 77 ข้อตอนนั้นไม่เคยจับได้ (ดู `docs/phase-3-report.md`):

> ผู้ใช้สั่งลบ → agent หยุดรออนุมัติ → ผู้ใช้ *พิมพ์ข้อความใหม่* โดยยังไม่กด → provider ตอบ `400 INVALID_TOOL_RESULTS` ("tool_calls ต้องตามด้วย tool message")

เพราะ thread ค้างอยู่ที่ tool call ที่ยังไม่มีผลลัพธ์ การทดสอบด้วย model ปลอมไม่เจอ เพราะ model ปลอมไม่ตรวจลำดับ message **bug จริงที่มีแต่ model จริงเท่านั้นที่เปิดเผย** ทางแก้: ระหว่างมีคำขออนุมัติค้าง `chat` และ `chat/stream` ตอบ `409` พร้อมข้อความไทย, `GET /conversations/:id/approvals?status=pending` ให้ UI วาด dialog ซ้ำหลังรีเฟรช, และการตัดสิน "stale" (งานหายไประหว่างรอ) จะปิด thread ด้วย reject อัตโนมัติ — ทั้งสามมี spec ที่ RED ก่อน GREEN

## 5. Solution Design

ทำเป็น 13 milestone — แต่ละอันจบด้วยสิ่งที่ตรวจได้

| # | เป้าหมาย | ไฟล์หลัก | ตรวจด้วย | tag |
|---|---|---|---|---|
| 01 | โปรเจกต์ + schema | `prisma/schema.prisma`, `src/config` | `pnpm --filter task-api test test/foundation.spec.ts` | `milestone-01` |
| 02 | auth + CRUD API | `src/auth`, `src/tasks` | `… test/capstone-tasks.spec.ts` + `test/auth-conversations.spec.ts` | `milestone-02` |
| 03 | chat model (inject ได้) | `src/ai/model.provider.ts` | `… test/foundation.spec.ts` | `milestone-03` |
| 04 | task tools (13 ตัว) | `src/ai/task-tools.ts` | `… test/capstone-tasks.spec.ts` | `milestone-04` |
| 05 | agent | `src/ai/agent.service.ts` | `… test/capstone-agent.spec.ts` | `milestone-05` |
| 06 | structured output | `src/ai/summary.service.ts` | `… test/capstone-agent.spec.ts` | `milestone-06` |
| 07 | conversation + checkpointer | `src/conversations` | `… test/auth-conversations.spec.ts` | `milestone-07` |
| 08 | middleware + HITL | `src/ai/*.middleware.ts`, `src/conversations/approvals.service.ts` | `… test/approvals.spec.ts` | `milestone-08` |
| 09 | knowledge base + RAG | `src/knowledge` | `… test/capstone-knowledge.spec.ts` | `milestone-09` |
| 10 | streaming API (SSE) | `conversation-chat.controller.ts` | `… test/sse.spec.ts` | `milestone-10` |
| 11 | frontend chat | `apps/task-web` | `pnpm --filter task-web test` + `next build` | `milestone-11` |
| 12 | testing, evaluation, observability | `apps/task-api/eval/suite.ts`, `src/usage` | `… test/eval-suite.spec.ts` | `milestone-12` |
| 13 | security + deployment | `Dockerfile`s, `docs/` | checklist ในหัวข้อ 11 | `milestone-13` |

> milestone 01–10 ทำใน Task 7–11 ของ Phase 3 จึงชี้ commit ที่ปิดงานกลุ่มนั้น (เช่น 01/03/05 → commit เดียวกัน) `git tag -l 'milestone-*'` แล้ว `git show milestone-05 --stat` เพื่อดูว่าแต่ละอันรวมอะไร

## 6. Step-by-step Walkthrough

**Milestone 01–04 — รากฐานและ tool.** `Task.dueDate` เป็น *วันที่* (UTC midnight) ไม่ใช่เวลา "วันนี้/เลยกำหนด" คำนวณจากปฏิทิน `Asia/Bangkok` (`bangkokToday`) — ผู้ใช้พูดว่า "พรุ่งนี้" หมายถึงวันของเขา ไม่ใช่ UTC ถ้าใส่ ISO datetime มา จะถูกแปลงเป็นวันที่กรุงเทพฯ ก่อนเก็บ

**Milestone 05–06 — agent และสรุปสัปดาห์.** `GET /summaries/weekly` ใช้ `withStructuredOutput` (Zod) แล้ว `safeParse` ซ้ำเสมอ เพราะ structured output **ไม่ตรวจ enum ให้** — ผลจริง:
```
headline: "มีงานค้าง 2 งาน เสร็จแล้ว 1 งาน และมีงานเลยกำหนด 1 งาน"
```

**Milestone 07–08 — บทสนทนาและ middleware.** thread = `user:<userId>:conv:<conversationId>` ตรวจด้วย `assertThreadOwner` ผู้ใช้อื่นได้ 404 (ไม่บอกว่ามีอยู่) ลำดับ middleware (ตัวแรก = นอกสุด): `toolError → logging → untrusted → dynamicPrompt → modelRetry → modelCallLimit → toolCallLimit → summarization → approval` `recursionLimit` = 150 เพราะ hook ของ middleware แต่ละตัวนับเป็น graph step

**Milestone 09 — knowledge base.** อัปโหลด `{title, filename(.txt|.md), content ≤ 30,000 ตัวอักษร}` → `RecursiveCharacterTextSplitter` 500/50 → ทิ้ง chunk < 20 ตัว → embed (Gemini 768 มิติ) *ก่อน* เขียน DB → insert ใน transaction เดียว ค้นด้วย `embedding <=> $1::vector`, join กับ `userId`, ตัดที่ distance ≤ 0.35 ผลจริงของรอบนี้:
```
▶ ขั้นตอน deploy ของทีมเป็นอย่างไร ตอบพร้อมอ้างอิงแหล่งที่มา
  ขั้นตอน deploy ตามคู่มือ (deploy.md, ส่วนที่ 1): … 4 ข้อ   tools=["searchKnowledge"]
▶ ราคาหุ้น Tesla วันนี้เท่าไร ค้นจากเอกสารของฉัน
  ไม่พบข้อมูลที่เกี่ยวข้องในเอกสารของคุณ                   tools=["searchKnowledge"]
```
ค่า 0.35 ปรับจากชุดเอกสารของ Part 16 — **ต้อง calibrate ใหม่กับเอกสารของคุณ**

**Milestone 10 — SSE.** `agent.stream({streamMode:["messages","updates"], signal})`; `res.on("close")` → abort ตัดสายแล้วหยุดงานจริง; เหตุการณ์ `token / tool_start / tool_end / approval_required / done / error` ใน `updates` นับเฉพาะ node `model_request` และ `tools` (node ของ middleware ส่ง message ซ้ำ ทำให้ event ซ้ำ — พบตอนทำ)

**Milestone 11 — frontend.** 8 หน้า: login, register, dashboard (กรองวันนี้/เลยกำหนด/สถานะ), task detail, chat, history, knowledge, settings (preferences) โครงสร้างแชท: `lib/sse.ts` (parser) → `lib/chat-reducer.ts` (state) → `lib/use-chat.ts` → `components/chat/*`

- `SseParser` ใช้ `TextDecoder` แบบ `stream: true` — อักษรไทย 3 ไบต์ที่ถูกตัดกลาง chunk ไม่เพี้ยน (เทสต์ป้อนทีละไบต์)
- ข้อความจาก model render แค่ `**ตัวหนา**` และ `` `โค้ด` `` เป็น React element (ไม่มี HTML ดิบ ไม่ใช้ `dangerouslySetInnerHTML`) กัน XSS; ข้อความของผู้ใช้แสดงเป็น text ล้วน
- ปุ่ม "หยุด" = `AbortController.abort()` → server เห็น `close` แล้วหยุด
- dialog อนุมัติแสดง *ชื่องาน* (ค้นจาก id) ไม่ใช่แค่ uuid กดซ้ำไม่ส่งซ้ำ; รีเฟรชหน้าแล้ว dialog กลับมา (จาก `approvals?status=pending`)

**Milestone 12 — ประเมินผล.** ดูหัวข้อ 10 · **Milestone 13 — security + deployment.** ดูหัวข้อ 11–12

## 7. Code Examples (ที่ควรเปิดอ่านจริง)

| ไฟล์ | ดูอะไร |
|---|---|
| `apps/task-api/src/ai/task-tools.ts` | tool 13 ตัว: schema ไม่มี `userId`, อ่านจาก `runtime.context` |
| `apps/task-api/src/ai/approval.middleware.ts` | HITL + ExecutionGuard (ตรวจสิทธิ์ซ้ำตอนทำ) |
| `apps/task-api/src/conversations/approvals.service.ts` | claim แบบ `updateMany where status=pending`, idempotent, stale → 409 |
| `apps/task-api/src/knowledge/knowledge.service.ts` | chunk → embed → transaction, ค้นด้วย `<=>` + userId join |
| `apps/task-api/eval/suite.ts` | 13 กรณีประเมิน + agent ที่ถดถอยจงใจ |
| `apps/task-web/lib/sse.ts`, `chat-reducer.ts` | parser + state machine ของแชท |

## 8. Best Practices

- ให้ **tool เป็น adapter บางๆ** เหนือ service ตัวเดียวกับ REST — กฎธุรกิจมีที่เดียว
- เก็บ **role/locale ใน DB อ่านทุก request**; JWT มีแค่ `sub` (token ปลอมที่อ้าง `role: admin` ไม่ได้อะไร)
- **ทุกการเขียนที่ทำลายต้องมี audit row** (`AuditLog`: action + detail JSON)
- ตั้ง **เพดาน** ทุกอย่าง: model calls 12 / tool calls 10 ต่อ run, rate limit 20 ครั้ง/นาที/ผู้ใช้, body 100 KB
- แปลง error ของ provider เป็นข้อความไทยที่ไม่มี key/stack (`classifyError`: 429→503, timeout→504, 5xx→503)
- ทดสอบ **ด้วย model ปลอมเพื่อพิสูจน์ guard** และ **ด้วย model จริงเพื่อหา bug ที่ model ปลอมไม่รู้จัก** — สองอย่างนี้ไม่แทนกัน

## 9. Common Mistakes

| ผิดพลาด | ผลที่เกิดจริงในโปรเจกต์นี้ |
|---|---|
| ให้ model ถามยืนยันเองในแชทก่อนลบ | model ถามกลับแทนเรียก `deleteTask` → ระบบอนุมัติไม่ทำงาน แก้: prompt บอก "เรียก deleteTask ทันที ระบบจะขออนุมัติเอง" |
| ปล่อย `HttpException` จาก service ทะลุ tool | validation error ของ tool กลายเป็น HTTP 400/500 ของ *ทั้งแชท* แก้: `ToolErrorMiddleware` คืน `ToolMessage(status:"error")` |
| นับ tool call ทั้ง thread | `toolCalls` ของ reply รวมของเทิร์นก่อนๆ แก้: นับหลัง human message ล่าสุด |
| ใช้ rate limit ตัวเดียวกันในทุก spec | spec อนุมัติชน 20/นาที แก้: env ของเทสต์ตั้ง 1000, spec ของ rate limit ตั้ง 20 |
| ส่งข้อความใหม่ตอนมีคำขออนุมัติค้าง | provider 400 (หัวข้อ 4) |
| เชื่อว่า `withStructuredOutput` ตรวจ enum | ค่านอก enum ผ่านเข้ามา แก้: `safeParse` ซ้ำเสมอ |

## 10. Real-world Use Cases — ชุดประเมิน (milestone 12)

`apps/task-api/eval/suite.ts`: **13 กรณี ใน 7 หมวด** (tool-selection, create-update, retrieval, grounding, authorization, approval, no-tool) รันกับ agent จริงของแอป (middleware + DB จริง) ด้วย model สคริปต์ — ผลซ้ำได้ ไม่เสีย token
สิ่งที่วัดไม่ใช่ "model ฉลาดไหม" แต่ *ระบบรอบ model ทำตามสัญญาไหม*: เรียก tool ถูกตัว/args ถูก, **ผลข้างเคียงในฐานข้อมูลเกิดจริงกี่ครั้ง** (snapshot ก่อน/หลัง), ข้อมูลของคนอื่นไม่ถูกแตะ, เอกสารที่ค้นเจอตรง, คำตอบอ้างแหล่งที่มาที่ค้นเจอจริง
**ตัวพิสูจน์ว่าชุดนี้ใช้ได้:** `regressedRunner` คือ agent ที่ถดถอยจงใจ (ไม่มี approval, tool เชื่อ `userId` ที่ model ส่ง) — spec ยืนยันว่ามัน **ตกกรณี** `approval-delete-own`, `authz-delete-foreign`, `authz-delete-foreign-approved`, `authz-model-userid` ชุดประเมินที่ไม่เคยเห็นตัวอย่างที่ควรตก พิสูจน์อะไรไม่ได้
ผลที่รันจริง: agent จริง **13/13**; agent ที่ถดถอย **7/13** — ตก 6 กรณี: 4 กรณีที่ตั้งใจ (ลบโดยไม่ขออนุมัติ, ลบงานคนอื่น, ลบงานคนอื่นแม้ผ่านการอนุมัติแล้ว, เชื่อ `userId` จาก model) และอีก 2 กรณี (`complete-own`, `priority-own`) เพราะ agent ถดถอยตัวนี้ไม่มี tool เหล่านั้นเลย (ไม่ใช่การพิสูจน์ guard — อย่านับเป็นหลักฐาน) ขีดจำกัด: model สคริปต์ตอบตามบท จึงไม่ได้วัด "model เลือก tool ถูกไหม" — อันนั้นใช้ชุดของ Part 18 (`pnpm play 18-13`) กับ model จริง

**Observability:** ตาราง `UsageLog` บันทึก `{userId, route, status, ms, inputTokens, outputTokens}` ต่อ request (ผลจริง: ประมาณ 2.3–3.7k token input ต่อเทิร์นของเธรดใหม่ — tool 13 ตัวกับ system prompt กินเป็นก้อนใหญ่) LangSmith เปิดได้ด้วย `LANGSMITH_TRACING=true` (ปิดเป็นค่าเริ่มต้น; `pnpm test` ไม่ส่ง trace)

## 11. Security Checklist → หลักฐาน

| หัวข้อ | กลไก | spec ที่พิสูจน์ |
|---|---|---|
| ปกป้อง key | `.env` ถูก ignore; error ถึงผู้ใช้ไม่มี key/stack | `production.spec` “provider 429 → 503 Thai body without secrets or stack” |
| Authentication | scrypt hash, JWT 15 นาที, token ปลอม/หมดอายุ → 401 | `auth-conversations.spec` “wrong password…”, “401 without / forged / expired token”, “password is stored hashed” |
| Authorization | role อ่านจาก DB ไม่เชื่อ token | `auth-conversations.spec` “role in the token is NOT trusted” |
| แยกข้อมูลผู้ใช้ | `userId` อยู่ใน `where` ทุก query; thread namespace; 404 | `auth-conversations.spec` “user B gets 404…”, `capstone-tasks.spec`, `capstone-knowledge.spec` “another user never sees my chunks” |
| Validation | Zod ทุกขอบ (REST, tool, อัปโหลด) | `capstone-tasks.spec`, `capstone-knowledge.spec` “only .txt/.md and non-empty text…” |
| Prompt-injection | ผลภายนอกห่อ `<untrusted-data>` + ปิดแท็กไม่ได้ | `production.spec` “tool results are wrapped…”, `capstone-knowledge.spec` “prompt injection inside a document” |
| Tool permission | schema ไม่มี `userId`; ตรวจเจ้าของซ้ำตอนทำ | `auth-conversations.spec` “…even if the model passes another userId”, `approvals.spec` “approve after the task was removed → 409” |
| Rate limiting | sliding window 20/นาที/ผู้ใช้ + `Retry-After` | `production.spec` “the 21st chat request…” |
| Audit log | แถว `AuditLog` ทุกการตัดสินใจ | `approvals.spec` “approve → … an audit row is written” |
| อนุมัติก่อนลบ | HITL, idempotent, race-safe | `approvals.spec` “calling the endpoint twice…”, “two concurrent decisions → exactly one execution”; **และ** `eval-suite.spec` agent ถดถอยตก |

## 12. Deployment Basics

- `apps/task-api/Dockerfile`, `apps/task-web/Dockerfile` — multi-stage, ไม่มี secret ใน image (รับ env ตอนรัน), รันด้วย user `node` ที่ไม่ใช่ root (Dockerfile ตอนแรกพังสองจุด: ไม่มี `corepack` ใน node:26 และ `prisma generate` หา schema/.env ไม่เจอ — แก้แล้วเมื่อ build จริง)
- ตัวแปรที่ต้องตั้งบน host: `TASK_API_DATABASE_URL`, `JWT_SECRET` (สุ่ม ≥ 32 ไบต์), `TOKENME_API_KEY` (หรือ `GROQ_API_KEY`/`DEEPSEEK_API_KEY` + `AI_PROVIDER`), `GOOGLE_API_KEY` (embeddings), `WEB_ORIGIN` (origin ของเว็บ — CORS อนุญาตเฉพาะนี้), `NEXT_PUBLIC_API_URL` (ถูกฝังตอน *build* ของเว็บ และ **เปิดเผยในเบราว์เซอร์** — ห้ามใส่ความลับ)
- migration: `prisma migrate deploy` (ไม่ใช่ `migrate dev`) ก่อนเริ่มเซิร์ฟเวอร์; ฐานข้อมูลต้องเปิด extension `vector`
- **ข้อจำกัดที่ต้องรู้ก่อนขึ้น production จริง:** ประวัติแชท (checkpointer) เก็บใน Postgres แล้ว (schema `langgraph`, รีสตาร์ทแล้วไม่หาย; ตั้ง `CHECKPOINTER=memory` ถ้าอยากเก็บใน RAM) แต่ `InMemoryStore` (preferences), rate limiter และ lock ต่อบทสนทนายังอยู่ในหน่วยความจำ → รีสตาร์ทแล้วหาย/รันได้ instance เดียว ต้องย้ายไป Postgres/Redis ก่อนขยาย

## 13. Workshop

[`workshops/part-20/README.md`](../../workshops/part-20/README.md) — รายการตรวจรับ 20 ข้อ + rubric ให้คะแนน

## 14. Summary

- ระบบ AI ที่เชื่อถือได้ = **guard ในโค้ด + การทดสอบที่พิสูจน์ guard + การรันจริงเพื่อหาสิ่งที่ทดสอบไม่เห็น**
- ตัวตนไหลทางเดียว (token → context → tool); ข้อความภายนอกเป็นข้อมูลเสมอ; ไม่รู้ก็บอกว่าไม่รู้
- ชุดประเมินต้องพิสูจน์ว่า *ตกเป็น* เมื่อของพัง ไม่ใช่แค่ *ผ่าน* เมื่อของดี

### สิ่งที่ Part นี้ **ไม่ได้** ทำ / ยังไม่ได้พิสูจน์
- ยังไม่ deploy ขึ้น host จริง Docker image ทั้งสอง **build ผ่านบนเครื่องนี้** (task-api 905 MB, task-web 961 MB — ใหญ่เพราะยังเป็น image ของ workspace ทั้งก้อน ไม่ได้ตัดแต่ง) และ container ของ api รันขึ้นแล้วตอบ 401 ที่ `/auth/me`; container ของเว็บรันขึ้นและตอบ 200 ที่ `/login`; migration รันใน image ได้ (`migrate deploy` → "No pending migrations"); ไม่ได้ทดสอบ flow เต็มใน container
- หน้าเว็บตรวจด้วย unit test + `next build` + การรัน flow ผ่าน client code เดียวกับเว็บเทียบกับ API จริง — **ไม่ได้เปิดเบราว์เซอร์ดู/screenshot** (เครื่องมือเบราว์เซอร์เปิดไม่ได้ขณะทำ)
- คุณภาพ retrieval ตรวจกับ Gemini จริงด้วยเอกสารเล็กๆ ไม่กี่ชิ้น; spec ใช้ embeddings ปลอม
- ฟีเจอร์ LangSmith เกิน free plan, multi-instance/Redis, Postgres checkpointer — ไม่ได้ทำ
