# Phase 3 Report — Parts 17–20 (Production AI)

## What exists
- Part 17 (Middleware & HITL) 12 examples · Part 18 (Testing & Evaluation) 13 examples · Part 19 (Backend, `apps/task-api`) · Part 20 (Capstone, `apps/task-api` + `apps/task-web`), plus READMEs and workshops for all four.
- 13 capstone milestones tagged `milestone-01 … milestone-13` (01/03/05, 07/10, 02/04, 06/08 share commits — the backend was built in groups; see the README table).

## Numbers (from the final run of this branch)
| Check | Result |
|---|---|
| `pnpm typecheck` (root) · `task-web typecheck` | 0 errors · 0 errors |
| `pnpm test` (root) | 247 passed / 27 files |
| `pnpm --filter task-api test` (real PostgreSQL, scripted model, fake embeddings) | 110 passed / 10 files (after the review-fix pass; 93 before) |
| `pnpm --filter task-web test` | 25 passed / 4 files |
| `pnpm --filter task-web build` (Next 16.4.6, Node 26) | passes; 10 routes |
| Offline AI eval suite (`apps/task-api/eval/suite.ts`, 12 cases) | real agent 12/12 · deliberately regressed agent 7/12 (`.superpowers` output kept locally) |
| Secret scan | `.env` git-ignored; prefixes of all 5 secrets in `.env` (4 API keys + `JWT_SECRET`) have 0 hits in `git log -p --all`; only fake `lsv2_pt_secretvalue123` test fixture is tracked |

## Live runs (real providers, 2026-11-25)
- Outline example commands (add, due today, unfinished, search, complete, prioritize, weekly summary, delete + approval, knowledge answer with source, off-topic → not found) ran against the live API on DeepSeek with real Gemini embeddings; all behaved as specified. Tokens per turn were 3.3k–6.5k input on short threads (13 tools + system prompt dominate).
- Groq quota (200k tokens/day) was exhausted: Groq runs of the demo returned the mapped Thai 503 after the first two commands — which also exercised the error mapping live.

## Findings worth teaching
1. **Live-only bug:** a new chat message while an approval is pending → provider `400 INVALID_TOOL_RESULTS`. Scripted models don't validate message order. Fixed with 409 + pending-approval endpoint + stale approval closes the thread (all RED→GREEN).
2. Middleware hooks each count as LangGraph steps → `recursionLimit` 150; duplicate SSE events came from middleware nodes re-emitting messages.
3. `withStructuredOutput` doesn't enforce enums → always `safeParse` again.
4. Tool exceptions must become `ToolMessage(status:"error")`, otherwise one bad argument fails the whole HTTP request.
5. An eval suite must be shown to *fail* on a regressed agent; the regressed agent here also fails 2 cases only because it lacks those tools — not evidence about guards, and the README says so.
6. Thai text split mid-byte across network chunks is a real SSE hazard: `TextDecoder({stream:true})`, tested byte-by-byte.

## Skipped / not verified (be honest with learners)
- **Browser UI not driven or screenshotted** (Chrome DevTools MCP profile was locked). Pages are verified by build + unit tests + running the same client code (`ApiClient`, `streamChat`, `chatReducer`) against the live API.
- **Part 17–18 examples were not all re-run in the final pass**: Groq's daily quota was exhausted (17-03…17-12 returned 429 in the re-run; 17-01/02/09 and 18-01/02 exit 0). They were run live earlier in Tasks 2–6 (see ledger); the offline-capable ones are covered by `pnpm test`.
- Docker: both images built locally (task-api 905 MB, task-web 961 MB, not slimmed); the API container started and answered 401 on `/auth/me` against the dev DB. The web container answers 200 on `/login` and `migrate deploy` runs inside the API image. First drafts were broken (no corepack in node:26; `prisma generate` needed the schema and no `.env`; the web CMD called `pnpm`, which the final stage lacks) — found only by building and running.
- `workshops/part-19` has an unverified solution sketch (requirements + acceptance criteria are real).
- Retrieval quality was checked live only on tiny documents; threshold 0.35 must be re-calibrated per corpus.
- `--langsmith` mode for the task-api eval suite is not implemented (the Part 18 pipeline covers LangSmith); MemorySaver/InMemoryStore/rate limiter are in-memory (single instance, lost on restart); no real deployment; LangSmith features beyond the free plan untouched.

## Whole-branch review (fresh reviewer, most capable model) and the fix pass
The reviewer found **no cross-user leak** but 2 Critical + 6 Important issues, all verified by probes and fixed RED→GREEN in `apps/task-api/test/final-review.spec.ts` (17 new cases):
- C1 approving delete #1 when the model then asked for delete #2 lost the 2nd request and stuck the thread → a new Approval is created and returned.
- C2 client disconnect mid-tool / exceeding the tool-call cap left tool calls without results (provider 400 on every later message) → thread is repaired before each message; cap uses `exitBehavior:"continue"`.
- I1 restart while an approval was pending locked the conversation → approval closes as expired (409), chat works.
- I2 resume failing *after* the tool ran told the user "nothing was deleted" and wrote no audit → 503 "done, but AI reply failed", approval decided, audit for every action; stale decisions are audited.
- I3 rate limit was per controller (≈60/min, not 20) and `/auth` unlimited → one shared budget per user; `/auth/*` limited per IP.
- I4 `dueDate` accepted junk ("Dec 5", "5/12/2026", datetimes without offset) → strict.
- I5 web container did not start (`pnpm` missing in final stage) → fixed and run.
- I6 a README "real output" for MCP injection was not evidence → replaced by an honest statement.
