# Phase 2 Report — Parts 09–16 (Agents, Memory, RAG)

## What ran
- All 77 examples in `examples/part-09…16` were run live, paced (8 s apart), on the first attempt: 77/77 exit 0.
- Providers: Groq `openai/gpt-oss-20b` (default), DeepSeek (workshops 11, 12, 16 solutions), Google Gemini embeddings (`gemini-embedding-001`, 768 dims), PostgreSQL 17 + pgvector in Docker.
- `pnpm typecheck` clean; `pnpm test` 175/175 with Docker up (pgvector tests executed, none skipped).
- Secret check: `.env` is git-ignored; the real key prefixes in `.env` do not appear in `git log -p --all`.

## Findings worth teaching
- Groq gpt-oss intermittently returns 400 `tool_use_failed` / `output_parse_failed` and 429 at 8000 TPM → `retryAsync` retries only transient errors.
- Gemini free tier returns empty vectors silently when quota is hit → validate and retry with backoff.
- `PGVectorStore`: plain INSERT (not upsert), uuid ids, `initialize` holds a client, score = cosine distance, filter keys are interpolated into SQL.
- A plain top-K retriever can never answer "not found" → distance threshold (0.35, calibrated on this corpus) plus an explicit NOT_FOUND path that skips the model.
- JSON fragments were noise in retrieval → `schedule.json` not indexed by default.
- Indirect prompt injection planted in `activities.md` was not obeyed in tested runs on Groq and DeepSeek; this is not a guarantee.

## Skipped / not done
- LLM-as-judge evaluation (16-11) is described, not implemented.
- `pdf-parse` dependency is unused by `PDFLoader` (candidate for removal).
- Parts 17–20 (Phase 3) need LangSmith (`LANGSMITH_API_KEY` not provided) and their own plan.

## Known security note
`PGVectorStore` interpolates metadata filter *keys* into SQL; keys must come from code, never from users (documented in the cheatsheet and Part 15).
