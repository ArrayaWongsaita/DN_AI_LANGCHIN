# Cleanup ledger — docs drift, deferred minors, leftovers

Branch `docs-tokenme-drift`. What was done, how it was verified, and what was deliberately not done.

## 1. Docs drift after TokenMe became the default

- Parts 01–03: setup, key names, sample outputs re-recorded from real TokenMe runs (`pnpm play 1-1 … 3-7`).
  03-03 was rewritten around the real problem on this provider (reasoning tokens eat `maxTokens`; `thinking: false` fixes it).
  03-06 now compares two models that exist on TokenMe (`deepseek-v4.1-flash`, `qwen3.8-27b`).
- Examples 01-02, 02-02…02-06, 03-01, 03-03, 03-07, 06-04 and the Part 02/03 workshop solutions now use TokenMe
  (`modelProvider: "openai"` + `configuration.baseURL`), so `@langchain/openai@1.8.5` was added as a declared dependency
  (it was previously only present transitively).
- Parts 04–20, workshops, README, cheatsheet: key requirements and provider lists updated.
  Sample outputs in Parts 04–11 and 16–20 were **not** re-recorded one by one; each part carries a note that the
  recorded text came from Groq/DeepSeek and that every example was re-run on TokenMe and passes (169 examples, 2026-11).
- Historical documents (`docs/superpowers/*`, `docs/phase-*-report.md`) are left as written.

## 2. Deferred minors from Phase 3

| Item | Result | Test |
|---|---|---|
| `wrapUntrusted` closing tag was case-sensitive | fixed (case-insensitive, tolerates spaces) | `hardening.spec.ts` |
| `WEB_ORIGIN` comma split not trimmed | fixed (`parseOrigins`) | `hardening.spec.ts` |
| ApprovalDialog stuck after a 409 | fixed: on 409 the pending list is re-read; if the approval is gone the dialog closes, otherwise the error stays so the user can retry (`submitDecision`) | `approval-decision.test.ts` |
| Duplicate `UsageLog` rows on SSE | fixed: stream route records itself, interceptor skips it (`@SelfRecordedUsage`) | `sse.spec.ts` |
| Two tabs posting to one conversation | fixed: per-conversation in-memory lock → 409 Thai message | `concurrent-chat.spec.ts` |
| English error strings | fixed for unknown route, broken JSON, 413, and zod default messages | `hardening.spec.ts` |
| Postgres checkpointer not wired | **not done** — see below | — |

Each fix was written test-first; the failing run was observed before the change (for `lib/approval.ts` the first RED was the missing module; the others failed on assertions or on a missing function).

**Postgres checkpointer — not done, on purpose.** `AgentService` still uses `MemorySaver`, so conversation history is lost on restart
and the per-conversation lock only works for one instance (both limits are already stated in Part 20). Wiring `PostgresSaver` means a
schema/`setup()` step, shutdown handling, `deleteThread` semantics and DB-backed tests; it is a separate round, not a minor.

## 3. Leftovers

- **16-11 LLM-judge:** implemented as an advisory pass (separate `judge:` line, never counted in pass/fail).
  Sanity-checked once with a faithful and a fabricated answer ("…ค่าเรียน 500 บาทต่อเดือน" → `grounded: false`). One probe, not a benchmark.
- **`pdf-parse`:** it is not unused — it is a peer dependency of `PDFLoader` (13-05 and the curriculum loader). Kept; Part 13 now says so.
- **"Groq baseline 0.909":** no evidence was kept, so the claim was removed. 18-13 re-run on TokenMe gave 0.636 / 0.727, the same numbers
  the README already recorded; experiment ids were updated. 18-12 was re-run too and the README now shows that run (the model's results
  differ from the earlier recorded run, which the README says).
- **Token numbers in docs:** I could not find a concrete inconsistency by searching. Part 20's "2.3–3.7k input tokens per new-thread turn"
  was measured earlier and was **not re-measured** here.
- **`authz-delete-foreign`:** it only checked that the approval gate stops the call. Added `authz-delete-foreign-approved`
  (user approves, nothing foreign may change). The app answers 409 "งานนี้ไม่มีอยู่แล้ว (หรือไม่ใช่ของคุณ)…" and deletes nothing; the regressed
  agent fails the new case. Suite is now 13 cases (real 13/13, regressed 7/13).
- **Docker images:** both rebuilt from this branch (`task-api` 905 MB, `task-web` 965 MB — size unchanged, not reduced). The API image was started against the local Postgres and answered requests (new Thai 404 message seen). The web image was built but not started.

## Still unproven

Mobile/other browsers, `next start` in a browser, starters tried by real learners, summary quality beyond the rule checks.
