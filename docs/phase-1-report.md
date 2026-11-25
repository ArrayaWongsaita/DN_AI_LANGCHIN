# Phase 1 Report — Foundation (Parts 01–08)

วันที่: 2026-11-25 · branch `phase-1-foundation`

## สิ่งที่ส่งมอบ
- Part 01–08: README 14 หัวข้อ ภาษาไทย, ตัวอย่าง 61 ไฟล์ (`examples/part-NN/`), Workshop พร้อมเฉลยทุก Part
- โครงสร้างโปรเจกต์: `pnpm play N-M`, `scripts/friendly-errors.ts`, `src/models` (Groq/DeepSeek), `src/utils`, `src/pipelines`
- `docs/cheatsheet.md` (API ทั้งหมดที่สอนใน Part 01–08), `docs/course-outline.md`
- Unit tests 49 ข้อ (deterministic ไม่เรียก LLM), `pnpm typecheck` ผ่าน

## ผลการรันตัวอย่าง (live)
| Provider | ผล |
|---|---|
| Groq `openai/gpt-oss-20b` (ค่าเริ่มต้น) | 60/60 ตัวอย่างที่ไม่ interactive รันผ่าน; 04-08 (CLI chatbot) ตรวจแยกด้วย stdin pipe ใน Part 04 |
| DeepSeek `deepseek-flash` | ตรวจ 02-06, 03-xx (เปรียบเทียบ), 06-04 + workshop 06 (`thinking:false`) ผ่าน |
| Mock (ไม่เรียก API) | 06-10 (ก,ข), 07-09, 08-07, 08-09 |

การรันทุกตัวอย่างติดกันครั้งแรกโดน **429 (Groq free tier 30 RPM)** 29 ตัวอย่าง — เป็นข้อจำกัดโควตา ไม่ใช่บั๊ก; รันซ้ำแบบเว้นช่วงผ่านทั้งหมด (บันทึกไว้ใน cheatsheet)

## ข้อค้นพบสำคัญ (ถูกสอนไว้ใน README ของแต่ละ Part)
1. gpt-oss เป็น reasoning model: reasoning tokens นับรวมใน `maxTokens` → ตั้ง `reasoningEffort: "low"` เป็นค่าเริ่มต้น (Part 02–03)
2. DeepSeek ต้องปิด thinking (`thinking:false`) จึงใช้ structured output/tool calling ได้ (Part 06)
3. Schema ที่บังคับ field ที่ข้อมูลอาจไม่มี ทำให้ model แต่งค่า (ไซซ์ `['S']`) → อนุญาต array ว่าง + ตรวจกฎธุรกิจ (Part 06)
4. Generator ใน chain ไม่ทำให้สตรีมต่อเนื่อง (วนทีละตัวอักษรหลังรอข้อความครบ) → ตัดเดโมออก (Part 08)
5. Groq แบบสตรีมไม่ส่ง `usage_metadata` (Part 08)

## ข้ามไป / ยังไม่ทำ
- LangSmith (ยังไม่มี `LANGSMITH_API_KEY` — ต้องใช้ใน Part 18+)
- Embedding (Google Gemini) และ pgvector/Docker — Phase 2 (Part 14–16)
- Tools/Agents (Part 09–12) — Phase 2

## Phase ถัดไป
- Phase 2: Part 09–16 (Tools, Agent Loop, createAgent, Memory, Documents, Embeddings, Vector Stores, RAG)
- Phase 3: Part 17–20 (Middleware & HITL, Testing, Backend/NestJS, Capstone)
