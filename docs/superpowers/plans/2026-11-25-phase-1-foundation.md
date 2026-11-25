# LangChain Course — Phase 1 (Parts 1–8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the course repo skeleton, the `pnpm play` runner, a provider helper, and complete Parts 01–08 (Thai teaching README, runnable examples, workshop + solution), every example verified by running it.

**Architecture:** One folder per Part: `parts/NN-slug/README.md`, `examples/part-NN/NN-MM-slug.ts`, `workshops/part-NN/`. Examples are self-contained; they import at most `src/models`, `src/utils`. Parts 02–03 teach `initChatModel` directly; from Part 04 on, examples use the `createChatModel` helper.

**Tech Stack:** Node (current LTS, check `node -v`), pnpm, TypeScript (ESM, `"type": "module"`), tsx, LangChain.js v1 (`langchain`, `@langchain/core`, `@langchain/groq`, `@langchain/deepseek`), zod, vitest, dotenv (or `node --env-file`).

**Spec:** `docs/superpowers/specs/2026-11-25-langchain-course-design.md` (course brief saved to `docs/course-outline.md` in Task 1 is the source of truth for each Part's topics, example names/numbers, workshop and expected outcome).

## Global Constraints

- Learner-facing text (Part READMEs, comments explaining concepts, workshop text) is Thai with English technical terms explained in Thai; code identifiers, repo docs, commit messages are English.
- Part README has exactly these 14 sections in order: Introduction, Learning Objectives, Concept Explanation, Problem Demonstration, Solution, Visual Explanation, Coding Examples, Common Mistakes, Best Practices, Exercises (Basic/Intermediate/Challenge), Workshop, Summary, Knowledge Check (3–5 Qs: concept, code-reading, practical), Next Part.
- Example file naming: `examples/part-NN/NN-MM-slug.ts`; counts per Part: 01→3, 02→6, 03→7, 04→8, 05→9, 06→10, 07→9, 08→9. Names/numbers come from `docs/course-outline.md`.
- Run with `pnpm play 4-1` (also accepts `04-01`); each example runs standalone and prints its output.
- LangChain v1 modern API only; no `LLMChain`, `AgentExecutor`. Check each API on docs.langchain.com / reference.langchain.com before writing the example. Pin exact dependency versions (no `^`) and state them in README.
- Default model: Groq `openai/gpt-oss-20b`; second provider: DeepSeek (verify exact model ID from DeepSeek docs; author wrote "4.1"). Keys only in `.env` (`GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `GOOGLE_API_KEY`); never print, echo or commit `.env`; `.env.example` has names only.
- Mock data before real APIs; in-memory before persistent; keep free-tier call counts low.
- A Part is done only when every example was executed and the real output pasted as "Expected Output" (marked "ตัวอย่างผลลัพธ์ — LLM ไม่ได้ตอบเหมือนเดิมทุกครั้ง" where non-deterministic). Each README states the provider/mock used for verification.
- Commit after each task; commit messages in English.

## Review Focus

- `pnpm play` with bad input (`9-99`, `abc`, `4`, `04-1`): clear message, non-zero exit, lists available examples — never a stack trace.
- Missing/empty API key: example exits with a message naming the missing variable (not an SDK 401 stack).
- Message `content` returned as an array of content blocks instead of a string (provider/reasoning models): helper `messageText` returns the text anyway; examples never assume `typeof content === "string"`.
- Thai (multibyte) input/output survives prompts, streaming chunks, CLI chatbot readline, and `max_tokens` truncation does not crash parsing.
- Free-tier 429 / network error: Part 02 and Part 08 examples show a readable error or retry, and the CLI chatbots (04-08, 08 workshop) keep running after one failed turn.
- Structured output unsupported by provider/model (gpt-oss vs DeepSeek): Part 06 examples fail with an explanatory message or fall back, not silently return `undefined`.

---

### Task 1: Repo skeleton, outline, and `pnpm play`

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `vitest.config.ts`
- Create: `docs/course-outline.md` (the author's full course brief, verbatim, from the conversation)
- Create: `scripts/resolve-example.ts`, `scripts/playground.ts`, `tests/playground.test.ts`
- Modify: `README.md` (course map, setup, how to run, Part table with status column)

**Interfaces:**
- Produces: `resolveExample(arg: string, examplesRoot?: string): { part: number; index: number; file: string }` — throws `PlaygroundError` (exported class, `message` is Thai+English friendly text) when the arg is malformed, or the part/index has no file; `listExamples(part: number, examplesRoot?: string): string[]`.
- Produces: scripts `play` (`tsx scripts/playground.ts`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`).

- [ ] **Step 1:** Run `node -v`, `pnpm -v`; record in README the Node floor you used. Ask nothing if present.
- [ ] **Step 2:** Save the course brief verbatim to `docs/course-outline.md`.
- [ ] **Step 3: Failing test** `tests/playground.test.ts` using a temp `examplesRoot` with `part-04/04-01-human-message.ts`: assert `resolveExample("4-1", root).file` ends with `04-01-human-message.ts`; `"04-01"` gives the same; `"4-9"`, `"abc"`, `"4"`, `"0-1"` throw `PlaygroundError`; the error for `"4-9"` lists `04-01-human-message.ts`.
- [ ] **Step 4:** Run `pnpm test` — expect FAIL (module missing).
- [ ] **Step 5:** Implement `resolveExample`/`listExamples`/`PlaygroundError` in `scripts/resolve-example.ts`; `scripts/playground.ts` calls it, prints error and exits 1 on `PlaygroundError`, otherwise spawns `tsx <file>` with inherited stdio and `--env-file=.env` (if `.env` exists), forwarding the exit code; no-arg prints usage + list of Parts that have examples.
- [ ] **Step 6:** `pnpm test` PASS; `pnpm typecheck` PASS; `pnpm play 9-99` exits 1 with friendly message.
- [ ] **Step 7:** Commit `chore: scaffold course repo and pnpm play runner`.

### Task 2: Shared helpers (`src/models`, `src/utils`)

**Files:**
- Create: `src/models/index.ts`, `src/utils/env.ts`, `src/utils/text.ts`, `src/utils/mock-model.ts`
- Test: `tests/helpers.test.ts`

**Interfaces:**
- Produces: `requireEnv(name: string): string` — throws `Error("Missing env var NAME — copy .env.example to .env and set it")` when unset/blank.
- Produces: `messageText(msg: BaseMessage | AIMessageChunk): string` — concatenates text from string content or content-block arrays (text blocks only).
- Produces: `type ProviderName = "groq" | "deepseek"`; `createChatModel(opts?: { provider?: ProviderName; model?: string; temperature?: number; maxTokens?: number; timeout?: number; maxRetries?: number }): BaseChatModel` — default provider `groq`, default model `openai/gpt-oss-20b`; deepseek default model = the ID verified in this task; calls `requireEnv` for the matching key; built on `initChatModel`.
- Produces: `createMockChatModel(responses: string[]): BaseChatModel` (fake model returning the given texts in order; used by Part 08 429 simulation and tests; may wrap `FakeListChatModel`/equivalent from `@langchain/core`).

- [ ] **Step 1:** Install pinned deps (`langchain`, `@langchain/core`, `@langchain/groq`, `@langchain/deepseek`, `zod`; dev: `typescript`, `tsx`, `vitest`, `@types/node`). Record exact versions in README.
- [ ] **Step 2: Failing tests:** `requireEnv` throws with the variable name when unset and when `"  "`; `messageText(new AIMessage("hi")) === "hi"`; `messageText(new AIMessage({content:[{type:"text",text:"a"},{type:"text",text:"b"}]})) === "ab"`; `createChatModel()` with `GROQ_API_KEY` unset throws the `requireEnv` message; `createMockChatModel(["x","y"])` returns `"x"` then `"y"` via `invoke`.
- [ ] **Step 3:** Run — FAIL. **Step 4:** Implement (verify `initChatModel` provider keys and DeepSeek model ID in official docs first). **Step 5:** Tests + typecheck PASS.
- [ ] **Step 6:** One live smoke run (`createChatModel().invoke("say ok")`) for each provider whose key is present; note result in the commit body.
- [ ] **Step 7:** Commit `feat: add provider helper and utils`.

### Task 3: Part 01 — Introduction to LangChain

**Files:** Create `parts/01-introduction/README.md`, `examples/part-01/01-01-basic-llm-io.ts`, `01-02-direct-api-concept.ts`, `01-03-direct-vs-langchain.ts`, `workshops/part-01/README.md` (+ `solution/answers.md`)

**Interfaces:** Consumes `createChatModel`, `messageText`. 01-02 uses plain `fetch` to the provider's OpenAI-compatible chat endpoint (no SDK) to show the "direct API" cost; 01-03 shows the same call both ways side by side.

- [ ] **Step 1:** Read the LangChain overview/ecosystem docs (LangChain, LangGraph, LangSmith, Deep Agents) and note anything that changed from the brief.
- [ ] **Step 2:** Write the 3 examples (names/goals from outline); run each with `pnpm play 1-N`; verify exit 0 and output.
- [ ] **Step 3:** Write the README (14 sections) including the AI/ML/GenAI/LLM relation diagram and ecosystem diagram; paste real outputs.
- [ ] **Step 4:** Workshop = decision-analysis exercise ("LLM direct vs LangChain vs LangGraph") with 5 sample apps, criteria, and answer key in `solution/answers.md`.
- [ ] **Step 5:** `pnpm typecheck`; mark Part 01 done in root README table; commit `docs: add Part 01`.

### Task 4: Part 02 — Project Setup & First Chat Model

**Files:** Create `parts/02-setup-first-model/README.md`, `examples/part-02/02-01-hello-typescript.ts` … `02-06-basic-error-handling.ts`, `workshops/part-02/README.md` + `solution/hello-world.ts`

**Interfaces:** Consumes `requireEnv`. Examples 02-03..02-06 call `initChatModel` directly (not the helper) with `modelProvider: "groq"`; 02-06 provokes and prints distinct messages for invalid key, invalid model name, network error (bad base URL), and 429-style/rate-limit handling (simulated if not reproducible).

- [ ] **Step 1:** Read official setup/models docs; confirm `initChatModel` signature and error classes.
- [ ] **Step 2:** Write 6 examples; run each (02-06 temporarily with bad key/model via env override inside the script, never editing `.env`).
- [ ] **Step 3:** README: project init walk-through (package.json `type: module`, tsconfig, scripts, `.env` / `.env.example` / `.gitignore`), package roles, API-key safety.
- [ ] **Step 4:** Workshop "AI Hello World" (readline Q&A via Terminal) with acceptance criteria; solution file runs.
- [ ] **Step 5:** Typecheck; update root README; commit `docs: add Part 02`.

### Task 5: Part 03 — Chat Models & Model Configuration

**Files:** Create `parts/03-chat-models/README.md`, `examples/part-03/03-01-configure-chat-model.ts` … `03-07-switch-provider.ts`, `workshops/part-03/README.md` + `solution/compare.ts`

**Interfaces:** Consumes `createChatModel`. 03-05 prints `usage_metadata` (input/output/total tokens) and `response_metadata` finish reason; 03-07 runs the same prompt on Groq then DeepSeek (skips DeepSeek with a message if its key is absent).

- [ ] **Step 1:** Read docs for model config params (temperature, maxTokens, timeout, maxRetries, baseUrl) and usage metadata fields.
- [ ] **Step 2:** Write 7 examples; run; note which parameters gpt-oss ignores/rejects (put in "Common Mistakes").
- [ ] **Step 3:** README incl. provider table (OpenAI, Anthropic, Google, DeepSeek, OpenRouter, OpenAI-compatible, local) as concepts only.
- [ ] **Step 4:** Workshop: comparison script printing a table (model/config × latency × tokens) + quality notes template; solution runs.
- [ ] **Step 5:** Typecheck; update root README; commit `docs: add Part 03`.

### Task 6: Part 04 — Messages & Conversation

**Files:** Create `parts/04-messages-conversation/README.md`, `examples/part-04/04-01-human-message.ts` … `04-08-cli-chatbot.ts`, `workshops/part-04/README.md` + `solution/chatbot.ts`

**Interfaces:** Consumes `createChatModel`, `messageText`. 04-08 is an interactive readline chatbot: `/reset` clears history, `/exit` quits, a failed turn prints the error and keeps the session, history trimmed with `trimMessages` (verify current import path) beyond a token/message cap.

- [ ] **Step 1:** Read messages docs (SystemMessage/HumanMessage/AIMessage/ToolMessage, content blocks, `trimMessages`).
- [ ] **Step 2:** Write 8 examples; run non-interactive ones; run 04-08 by piping scripted input (`printf 'ฉันชื่อสมชาย\nฉันชื่ออะไร\n/exit\n' | pnpm play 4-8`) and confirm it recalls the name.
- [ ] **Step 3:** README (stateless nature demo is the centerpiece of 04-05/04-06).
- [ ] **Step 4:** Workshop CLI chatbot with memory + acceptance criteria; solution runs with the piped test above.
- [ ] **Step 5:** Typecheck; update root README; commit `docs: add Part 04`.

### Task 7: Part 05 — Prompt Engineering & Templates

**Files:** Create `parts/05-prompts/README.md`, `examples/part-05/05-01-hardcoded-prompt.ts` … `05-09-dynamic-system-prompt.ts`, `workshops/part-05/README.md` + `solution/translator.ts`

**Interfaces:** Consumes `createChatModel`. Uses `PromptTemplate`, `ChatPromptTemplate`, `MessagesPlaceholder` (verify import paths in `@langchain/core/prompts`); prompts for reuse live in `src/prompts/` only where 05-08 teaches "Reusable Prompt" (`src/prompts/translator.ts` exporting `translatorPrompt`).

- [ ] **Step 1:** Read prompt template docs; confirm `format()`/`invoke()` return types.
- [ ] **Step 2:** Write 9 examples; run; include a prompt-injection demo in README (not an example file) for Prompt Security section.
- [ ] **Step 3 (test):** `tests/prompts.test.ts` asserting `translatorPrompt.invoke({...})` yields expected message roles and that all variables (source language, target language, politeness, style) appear — deterministic, no LLM.
- [ ] **Step 4:** README, workshop AI Translator (4 configurable parameters), solution; run solution on one Thai→English and one English→Thai sample.
- [ ] **Step 5:** `pnpm test && pnpm typecheck`; update root README; commit `docs: add Part 05`.

### Task 8: Part 06 — Structured Output & Zod

**Files:** Create `parts/06-structured-output/README.md`, `examples/part-06/06-01-unstructured-response.ts` … `06-10-handle-invalid-output.ts`, `workshops/part-06/README.md` + `solution/product-extractor.ts`; `src/utils/` unchanged.
- Test: `tests/part06-schemas.test.ts`

**Interfaces:** Consumes `createChatModel`. Workshop exports `productSchema` (zod: `name: string`, `price: number`, `color: string`, `sizes: string[]`, `category: string`) and `extractProduct(text: string): Promise<z.infer<typeof productSchema>>` from `workshops/part-06/solution/product-extractor.ts` so tests can import the schema.

- [ ] **Step 1:** Read docs for `withStructuredOutput` options (`method`/strategies, strict) and which Groq/DeepSeek models support json-schema vs tool/JSON mode.
- [ ] **Step 2 (test):** `productSchema.safeParse` succeeds for `{name:"เสื้อ",price:350,color:"ดำ",sizes:["M","L"],category:"clothing"}` and fails for `price:"350"` and missing `sizes`; a business rule test (`price > 0`) in 06-09's exported validator.
- [ ] **Step 3:** Run — FAIL; implement; PASS.
- [ ] **Step 4:** Write the 10 examples; run on Groq; run 06-04 and the workshop also on DeepSeek and record whether it works; 06-10 demonstrates retry on invalid output using `createMockChatModel`-free approach (real call with a deliberately impossible schema or a validator-rejected first attempt).
- [ ] **Step 5:** README + workshop; verify solution on `"เสื้อสีดำราคา 350 บาท มีไซซ์ M และ L"`.
- [ ] **Step 6:** `pnpm test && pnpm typecheck`; update root README; commit `docs: add Part 06`.

### Task 9: Part 07 — Runnables & LCEL

**Files:** Create `parts/07-runnables-lcel/README.md`, `examples/part-07/07-01-function-composition.ts` … `07-09-reusable-pipeline.ts`, `src/prompts/` unchanged, `workshops/part-07/README.md` + `solution/content-processor.ts`
- Test: `tests/part07-pipeline.test.ts`

**Interfaces:** Consumes `createChatModel`, `createMockChatModel`. Workshop exports `buildContentProcessor(model: BaseChatModel): Runnable<{ article: string }, { summary: string; keywords: string[]; sentiment: "positive" | "neutral" | "negative"; title: string }>`.

- [ ] **Step 1:** Read Runnable/LCEL docs (`pipe`, `RunnableSequence.from`, `RunnableLambda`, `RunnableParallel`/object-literal map, `RunnablePassthrough.assign`); confirm current import paths.
- [ ] **Step 2 (test):** with a mock model returning fixed text (plus structured-output pieces made deterministic through `RunnableLambda` stand-ins), assert `buildContentProcessor` output has all four keys and sentiment is one of the enum values.
- [ ] **Step 3:** FAIL → implement → PASS. Write 9 examples; run them live.
- [ ] **Step 4:** README (include "when not to use LCEL / when LangGraph" section) + workshop.
- [ ] **Step 5:** `pnpm test && pnpm typecheck`; update root README; commit `docs: add Part 07`.

### Task 10: Part 08 — Streaming, Batch & Concurrency

**Files:** Create `parts/08-streaming-batch/README.md`, `examples/part-08/08-01-invoke-vs-stream.ts` … `08-09-handle-rate-limit.ts`, `src/utils/throttled-model.ts`, `workshops/part-08/README.md` + `solution/{streaming-chatbot.ts,batch-translator.ts}`
- Test: `tests/throttled-model.test.ts`

**Interfaces:** Produces `createThrottledMockModel(opts: { failFirst: number; text: string }): BaseChatModel` — throws an error with `status = 429` for the first `failFirst` calls, then returns `text`. Used by 08-09 to show retry with exponential backoff without burning quota. 08-06/08-07 use small batches (≤5 inputs) on the real model; 08-08 aborts a stream via `AbortController` (verify `signal` option name).

- [ ] **Step 1:** Read streaming/batch docs (`stream`, `AIMessageChunk` concat, `batch({ maxConcurrency })`, `signal`).
- [ ] **Step 2 (test):** `createThrottledMockModel({failFirst:2,text:"ok"})`: first two `invoke` calls reject with `status===429`, third resolves `"ok"`.
- [ ] **Step 3:** FAIL → implement → PASS. Write 9 examples; run live (08-09 on the mock); measure and print TTFT and timings in 08-01/08-06.
- [ ] **Step 4:** Workshop: streaming CLI chatbot (Thai streaming works; `/exit`; Ctrl+C aborts current stream, not the process) + batch translator for ≥5 texts with `maxConcurrency: 2`; verify with piped input.
- [ ] **Step 5:** README; `pnpm test && pnpm typecheck`; update root README; commit `docs: add Part 08`.

### Task 11: Phase 1 wrap-up

**Files:** Modify `README.md`, create `docs/cheatsheet.md`

- [ ] **Step 1:** Cheatsheet v1: every API taught in Parts 01–08 (import path, one-line Thai description, tiny snippet).
- [ ] **Step 2:** Run all examples in sequence via a small loop (`for f in examples/part-0*/*.ts` excluding interactive ones 04-08, 02-?? readline ones), recording failures; fix or document.
- [ ] **Step 3:** `pnpm typecheck && pnpm test` clean; confirm `git status` shows no `.env` and `git log -p | grep -c "gsk_"` is 0 (no key leaked).
- [ ] **Step 4:** README Part table shows Parts 01–08 done, 09–20 "Phase 2/3"; write a short Phase-1 report (what ran on which provider, what was skipped/failed) as `docs/phase-1-report.md`.
- [ ] **Step 5:** Commit `docs: phase 1 wrap-up`.
