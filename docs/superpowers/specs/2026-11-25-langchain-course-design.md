# Design: LangChain.js Course Repo — "From Fundamentals to Production AI Agents"

Date: 2026-11-25 · Status: draft for approval

## Intent and why

The author teaches programming courses using GitHub repos (see `DN_T_PLAYWRIGHT`,
`dn_socket_io`, `DN_T_REACT_VITEST`: pnpm, Thai-language lesson text, small runnable
units, `docs/cheatsheet.md`). They want the same kind of repo for LangChain.js:
20 Parts in 6 Modules, taking a learner who knows JS/TS and async/await (no ML
background, never used LangChain) from "what is an LLM" to a production-style AI
Task Manager (NestJS + Prisma + pgvector + Next.js).

The reader is a Thai-speaking learner. Teaching text is Thai with English technical
terms (each explained in Thai). Code, code identifiers, repo docs and commit messages
stay English; code comments that explain concepts are Thai (per the course brief).

## Goals

- Every Part has teaching content following the 14-section template in the brief
  (Introduction → … → Next Part), the listed coding examples, and a Workshop with
  requirements, expected output and acceptance criteria.
- Every example file runs on its own: `pnpm play <part>-<n>` (e.g. `pnpm play 4-1`).
- Uses LangChain v1 modern API only (`createAgent`, `createMiddleware`,
  `initChatModel`, `tool()`, `withStructuredOutput`/`responseFormat`); no
  `LLMChain`/`AgentExecutor`. Every API is checked against official docs before use,
  and dependency versions are pinned and stated.
- Progression follows the brief's "simple before abstraction" rules (mock data →
  real API, in-memory → persistent, manual tool calling → agent, manual loop →
  `createAgent`, manual semantic search → vector store, basic RAG → agentic RAG).
- Content is LangGraph-ready (Part 7 and 11 say where LCEL/agents end and LangGraph
  begins) but does not teach LangGraph itself.

## Non-goals / anti-goals

- Not a LangGraph course; not an ML course.
- Not a repo where the learner fills in `TODO`s (that is the Vitest repo's style);
  examples are complete and runnable, and the learner modifies them via exercises
  and workshops.
- Anti-goal: examples that look right but were never run, or that use an API
  found only in old tutorials. A Part is not "done" until its examples ran
  against a real provider.
- Anti-goal: a learner needing to understand the whole repo to run one example.

## Constraints

- Node.js 20+ (check what is installed; prefer current LTS), pnpm, TypeScript, ESM
  (`"type": "module"`), `tsx` as runner.
- LLM providers: **Groq** `openai/gpt-oss-20b` (free tier) as the default;
  **DeepSeek** as the second provider (author wrote "model 4.1" — the exact model ID
  must be verified from DeepSeek docs at build time). Keys in `.env`:
  `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `GOOGLE_API_KEY` (already present; `.env` is
  git-ignored and never echoed or committed; `.env.example` lists names only).
- Embeddings: **Google Gemini** (`gemini-embedding-001`, free tier) via
  `GOOGLE_API_KEY`. Groq and DeepSeek have no embeddings API. Output dimension must
  be fixed explicitly and match the pgvector column (decision for the builder; 768
  is the likely choice for size/speed — verify the param name in the SDK).
- Vector DB: PostgreSQL + pgvector via a `docker-compose.yml` that **does not exist
  yet** (the author believed it did) — we write it (image `pgvector/pgvector`).
- Free-tier rate limits (Groq, Gemini) are real: examples must be light on calls,
  and Part 8 (batch/concurrency/429) must work within them.
- gpt-oss-20b on Groq and DeepSeek differ in tool-calling and structured-output
  support (e.g. strict JSON-schema vs. JSON mode / tool-based). Part 6 teaches this
  difference; examples should state which provider they were verified on.
- LangSmith needs a `LANGSMITH_API_KEY` that the author has not provided yet;
  Part 18/19/20 tracing examples degrade gracefully (skip with a clear message)
  if it is absent.
- Repo currently contains only `README.md` and `.env` (one commit).

## Approaches considered

1. **One folder per Part (chosen).** `parts/NN-slug/README.md` (teaching text) +
   `examples/part-NN/NN-MM-slug.ts` + `workshops/part-NN/`. Learner reads a Part
   and runs its examples without hopping directories; matches the author's
   `examples/part-NN/` layout.
2. All teaching text under `docs/`. Tidier index, but constant switching between
   text and code. Rejected.
3. Exercise-style with `TODO`s like `DN_T_REACT_VITEST`. Good practice but triples
   authoring time and cannot express Part 19–20 apps. Rejected.

Build order, chosen by the author: three phases, each verified before the next.

## Design

### Repo layout

```
langchain-course/ (this repo)
├── README.md                 course map, setup, how to run, Part table
├── docs/cheatsheet.md        API cheatsheet (grows each phase)
├── docs/superpowers/specs/   design + plans (not learner-facing)
├── parts/NN-slug/README.md   teaching content per Part (Thai, 14-section template)
├── examples/part-NN/NN-MM-slug.ts
├── workshops/part-NN/        README (requirements, expected output, acceptance
│                             criteria) + solution/
├── src/                      shared helpers ONLY where a Part says so
│   ├── models/               provider factory (groq | deepseek) from env
│   ├── embeddings/ vector-stores/ retrievers/ tools/ agents/
│   ├── middleware/ memory/ prompts/ utils/
├── documents/                sample docs for Parts 13–16 (school curriculum, Thai)
├── tests/                    Vitest tests (Part 18 material + repo self-checks)
├── scripts/playground.ts     `pnpm play 4-1` → resolves examples/part-04/04-01-*.ts
├── apps/                     phase 3 only
│   ├── task-api/             NestJS + Prisma (Part 19 workshop → Part 20 backend)
│   └── task-web/             Next.js + Tailwind (Part 20 frontend)
├── docker-compose.yml        postgres + pgvector
├── .env.example  .gitignore  package.json  tsconfig.json
```

Rules: each example is self-contained (imports `src/models` provider helper at most;
never another example); Thai comments on key lines; each file prints output and the
Part README shows the expected output; mock data before real APIs.

`pnpm play N-M` accepts `4-1` or `04-01`, lists the Part's examples if `M` is
omitted, and exits with a clear message on a missing example or missing env key.

### Part README template (every Part)

Introduction · Learning Objectives · Concept Explanation · Problem Demonstration ·
Solution · Visual Explanation (Mermaid or ASCII diagrams) · Coding Examples (with
Input/Process/Output and expected output) · Common Mistakes · Best Practices ·
Exercises (basic/intermediate/challenge) · Workshop · Summary · Knowledge Check
(3–5 Qs: concept, code-reading, practical) · Next Part.

### Parts and example counts (from the author's brief)

| Module | Part | Title | Examples |
|---|---|---|---|
| 1 Foundation | 01 | Introduction to LangChain | 3 |
| | 02 | Project Setup & First Chat Model | 6 |
| | 03 | Chat Models & Model Configuration | 7 |
| | 04 | Messages & Conversation | 8 |
| 2 Building Blocks | 05 | Prompt Engineering & Templates | 9 |
| | 06 | Structured Output & Zod | 10 |
| | 07 | Runnables & LCEL | 9 |
| | 08 | Streaming, Batch & Concurrency | 9 |
| 3 Agents | 09 | Tools & Tool Calling | 11 |
| | 10 | Agent Loop from Scratch | 8 |
| | 11 | Agents with `createAgent()` | 8 |
| | 12 | Agent Memory & Persistence | 10 |
| 4 Knowledge & RAG | 13 | Documents, Loaders, Splitters | 9 |
| | 14 | Embeddings & Semantic Search | 9 |
| | 15 | Vector Stores & Retrievers | 11 |
| | 16 | RAG | 11 |
| 5 Production | 17 | Middleware & Human-in-the-Loop | 12 |
| | 18 | Testing, Debugging, Evaluation | 13 |
| | 19 | Backend Integration (NestJS) | 15 |
| 6 Capstone | 20 | AI Personal Task Manager | 13 milestones |

Topic lists, workshop descriptions and expected outcomes per Part are exactly as in
the author's course brief (the source of truth for content scope; to be saved in
the repo as `docs/course-outline.md` so plans can reference it).

### Phases

1. **Phase 1 — Parts 1–8** (LLM only). Delivers repo skeleton, `pnpm play`,
   provider factory, Parts 1–8 content, examples, workshops, cheatsheet v1.
2. **Phase 2 — Parts 9–16** (tools, agents, memory, RAG). Adds docker-compose +
   pgvector, Postgres checkpointer, Gemini embeddings, sample documents.
3. **Phase 3 — Parts 17–20** (production). Adds Part 17 (root-level examples),
   Part 18 (Vitest + LangSmith), and `apps/task-api` (Part 19) / `apps/task-web`
   (Part 20) as separate pnpm workspace packages, since `pnpm play` does not fit
   multi-file apps. Part 19's 15 "examples" are small modules inside the
   NestJS app, each with its own runnable/testable entry.

Each phase is its own implementation plan and ends with: every example executed
against a real provider (or mock where the Part says so), outputs pasted into the
Part README, and a summary of anything that failed or was skipped.

### Verification standard

- Before writing an example: read the official doc page / API reference for the API.
- After writing: run it; record real output; fix drift between README and output.
- Non-deterministic LLM output is shown as "example output" and the README says
  so; assertions are only made on deterministic things (tool args, schema shape).
- Typecheck the whole repo (`tsc --noEmit`) in each phase.

## Left to the builder

- Exact package list and pinned versions (expected: `langchain`,
  `@langchain/core`, `@langchain/groq`, `@langchain/deepseek`,
  `@langchain/google-genai`, `@langchain/langgraph` and its Postgres checkpointer,
  `@langchain/community`/`@langchain/textsplitters`, `zod`, `pg`, `tsx`, `vitest`).
- Exact DeepSeek model ID; embedding dimension; pgvector index type for the demo.
- Content of the sample school-curriculum documents (Thai) for Parts 13–16.
- Diagram format (Mermaid vs ASCII) per Part.
- Whether Part 12 uses LangGraph's Postgres store or a thin custom store, per what
  the docs recommend at build time.
- Final content wording, exercises and knowledge-check questions.

## Builder-check resolutions (calls made by the designer, marked for author review)

- **Course brief.** The author's full brief (per-Part topic lists, named examples
  such as `04-06: Manual Conversation History`, workshops, expected outcomes,
  Part 20 spec incl. DB schema, API list and 13 milestones) exists in the
  conversation. Task 1 of the first plan is to save it verbatim as
  `docs/course-outline.md`; example names and numbers come from it. Acceptance
  criteria for workshops are not in the brief and are drafted by the builder.
- **Parts 17/19/20 "examples".** Part 17 examples run with `pnpm play 17-N` like
  any other. Part 19 is **one cumulative NestJS app** (`apps/task-api`); each
  numbered example is a module/file in it, with a Vitest spec or a documented
  `curl`/script entry to verify it, and a git tag `part-19-NN`. Part 20 evolves the
  same `apps/task-api` plus `apps/task-web`; milestones are git tags
  (`milestone-01` … `milestone-13`) and sections of the Part 20 README.
- **Plan scope.** Write and execute **Phase 1's plan only** first; Phases 2 and 3
  get their own plans after Phase 1 is reviewed.
- **Verification vs. free-tier quotas.** Running examples in batches over time is
  acceptable; heavy/looping examples may be verified on DeepSeek or a mock model
  where the Part's point is not provider behaviour. Part 8's 429 demo is simulated
  (fake throttled model) with at most one optional real-limit demo. Every
  example's README states which provider/mock it was verified on.
- **Solutions.** `workshops/part-NN/solution/` ships in the repo, visible from the
  start (course is self-study/teacher-led; the author can hide later). For Parts 19
  and 20 the workshop README points to `apps/` instead of duplicating code.
- **Docker.** Assumed available (the author said they run pgvector in Docker).
  No hosted-Postgres fallback is built.

## Open items the author may want to confirm

- LangSmith API key is needed for Part 18–20 tracing demos (see constraints).
- Node version on the author's machine (check at build start).
