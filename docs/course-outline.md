# Course Outline — LangChain.js: From Fundamentals to Production AI Agents

> Source of truth for Part scope. Condensed from the author's original brief: all Parts, objectives,
> topic groups, **example numbers/names**, workshops and outcomes are preserved.

Audience: JS/TS developers (functions, async/await), new to LangChain, no ML background.
Stack: Node.js, TypeScript, ESM, pnpm, tsx, LangChain.js v1 modern API, Zod, PostgreSQL + pgvector,
LangSmith, NestJS (backend integration). Avoid legacy APIs (`LLMChain`, `AgentExecutor`).

Teaching style: concept first → show the problem → introduce the solution; one idea per example;
immediate visible output; explain Input / Process / Output; workshop at end of every Part; keep it
LangGraph-ready. Each Part README follows the 14-section template (Introduction, Learning Objectives,
Concept Explanation, Problem Demonstration, Solution, Visual Explanation, Coding Examples, Common Mistakes,
Best Practices, Exercises (Basic/Intermediate/Challenge), Workshop, Summary, Knowledge Check (3–5 Qs),
Next Part). Examples: TypeScript, ESM, pnpm, Thai comments, runnable alone, expected output shown.
Progression rules: mock data → real API; in-memory → persistent; plain functions → framework;
manual tool calling → agent; manual agent loop → `createAgent()`; manual semantic search → vector store;
basic RAG → agentic RAG.

Run: `pnpm play 4-1`, `pnpm play 4-2`, … Examples are `examples/part-NN/NN-MM-slug.ts`.

References: docs.langchain.com/oss/javascript/langchain/overview ·
reference.langchain.com/javascript/langchain/ · docs.langchain.com/oss/javascript/langgraph/overview ·
docs.langchain.com/langsmith/ · academy.langchain.com · github.com/langchain-ai/langchainjs

---

## Module 1 — LangChain Foundation
Objective: understand how LLMs work, LangChain's role, and talk to an AI model from your own program.

### Part 01 — Introduction to LangChain (Beginner, 45–60 min)
Objectives: what LangChain is; what problems it solves; ecosystem relationships; when to choose it.
Topics: (1) AI/ML/Generative AI/LLM and how they relate; (2) LLM overview — input/output, token, context
window, inference, text generation, stateless nature, hallucination, limitations; (3) AI model vs AI
application vs AI workflow vs AI agent; (4) problems of calling model APIs directly — prompt management,
conversation history, multiple providers, tool calling, composing workflows; (5) LangChain — what/why,
framework not model, model abstraction, component composition, pros/cons, when not to use; (6) ecosystem:
LangChain, LangGraph, LangSmith, Deep Agents; (7) use cases: chatbot, text processing, information
extraction, agent, knowledge base, RAG, automation.
Examples: 01-01 Basic LLM Input and Output · 01-02 Direct Model API Concept · 01-03 Direct API vs LangChain Concept
Workshop: analyze sample applications — direct LLM, LangChain, or LangGraph?
Outcome: explain what LangChain is, what it solves, which work suits it.

### Part 02 — Project Setup & First Chat Model (Beginner, 60–90 min)
Objectives: create a TS LangChain project; manage env vars; call a Chat Model.
Topics: (1) Node, pnpm, TypeScript, ESM, tsx, env vars; (2) project init — package.json, `type: module`,
tsconfig, scripts, dependencies; (3) structure — src/, examples/, models/, prompts/, tools/, agents/,
scripts/, .env, .env.example, .gitignore; (4) packages — `langchain`, `@langchain/core`, provider
integration packages and their roles; (5) API keys — provider, creating/storing/reading keys, preventing
leaks, .gitignore; (6) first chat model — instance, `initChatModel()`, model name, `invoke()`, async/await,
`AIMessage`, reading content; (7) basic error handling — invalid key, invalid model, network, rate limit,
insufficient balance, try/catch.
Examples: 02-01 Hello TypeScript · 02-02 Read Environment Variables · 02-03 Initialize Chat Model ·
02-04 First Model Invocation · 02-05 Read AI Response · 02-06 Basic Error Handling
Workshop: AI Hello World — take a question from the user and print the answer in the terminal.
Outcome: create a project and call an AI model from scratch.

### Part 03 — Chat Models & Model Configuration (Beginner, 60 min)
Objectives: chat model abstraction; model configuration; choosing/switching providers.
Topics: (1) language model vs chat model, `BaseChatModel`, common interface, I/O; (2) providers — OpenAI,
Anthropic, Google, DeepSeek, OpenRouter, OpenAI-compatible, local; provider vs model; (3) configuration —
model name, temperature, max output tokens, timeout, max retries, base URL, provider-specific options and
their limits; (4) response — `AIMessage`, content, content blocks, response metadata, usage metadata,
finish reason, input/output/total tokens; (5) characteristics — (non-)deterministic output, capability,
context window, reasoning, tool calling, structured output, multimodal; (6) selection — fast vs reasoning,
cost, latency, quality; (7) provider switching, reusable model configuration, limits of the abstraction.
Examples: 03-01 Configure Chat Model · 03-02 Compare Temperature · 03-03 Limit Output Tokens ·
03-04 Inspect Response Metadata · 03-05 Inspect Token Usage · 03-06 Switch Model · 03-07 Switch Provider
Workshop: send one prompt to different models/configs; compare quality, speed, token usage.
Outcome: choose a model and configure it to fit an application.

### Part 04 — Messages & Conversation (Beginner, 60–90 min)
Objectives: message structure; how LLMs receive conversation context; build a multi-turn chatbot.
Topics: (1) messages — role, content, metadata, content blocks; (2) types — `SystemMessage`,
`HumanMessage`, `AIMessage`, `ToolMessage`; (3) system instruction — role, behavior, constraints, style;
(4) human message — user input, text, multiple human messages, multimodal basics; (5) AI message —
content, metadata, tool calls basics, reuse; (6) conversation — single/multi-turn, history, stateless LLM,
why the model doesn't remember, sending the messages array back; (7) manual management — build array,
append human/AI, keep order, reset; (8) context management — history vs token usage, context window limit,
message trimming basics.
Examples: 04-01 HumanMessage · 04-02 SystemMessage · 04-03 AIMessage · 04-04 Multiple Messages ·
04-05 Stateless Conversation · 04-06 Manual Conversation History · 04-07 Reset Conversation ·
04-08 Interactive CLI Chatbot
Workshop: CLI chatbot that converses continuously and remembers earlier messages.
Outcome: conversation memory comes from the application managing context, not from the LLM.

## Module 2 — Application Building Blocks
Objective: build structured AI applications with controlled input/output and reusable pipelines.

### Part 05 — Prompt Engineering & Prompt Templates (Beginner, 60–90 min)
Objectives: design structured prompts; reusable prompts; dynamic input.
Topics: (1) prompt — instruction, context, input, constraints, examples, output format; (2) techniques —
zero-shot, few-shot, role, contextual, delimiters, output constraints; (3) hardcoded-prompt problems —
string concatenation, duplication, maintainability, separating prompts from business logic; (4)
`PromptTemplate` — variables, `format()`, `invoke()`, multiple variables, reuse; (5) `ChatPromptTemplate`
— system/human/AI message templates; (6) dynamic prompt — `MessagesPlaceholder`, history, partial
variables, composing parts, dynamic system instructions; (7) organization — folders, naming, separation
from model, versioning basics; (8) security — prompt injection, trusted vs untrusted input, separating user
data from instructions, limits of prompt defenses.
Examples: 05-01 Hardcoded Prompt · 05-02 PromptTemplate · 05-03 Single Variable · 05-04 Multiple Variables ·
05-05 ChatPromptTemplate · 05-06 Few-shot Prompt · 05-07 MessagesPlaceholder · 05-08 Reusable Prompt ·
05-09 Dynamic System Prompt
Workshop: AI Translator with configurable source language, target language, politeness level, translation style.
Outcome: flexible, structured, reusable prompts.

### Part 06 — Structured Output & Zod Schema (Beginner–Intermediate, 90 min)
Objectives: unstructured output problems; schema for AI responses; use AI data in software.
Topics: (1) unstructured/semi-structured/structured output, string vs object, `JSON.parse()` and invalid
JSON problems; (2) schema, JSON Schema, runtime validation vs compile-time types; (3) Zod — string,
number, boolean, object, array, enum, optional, nullable, describe, parse, safeParse, `z.infer`; (4)
`withStructuredOutput()` — output schema, field descriptions, inference, required/optional, nested objects,
arrays of objects; (5) strategies — native structured output, tool-based, JSON mode, model capability,
provider compatibility; (6) validation — schema, business rules, invalid output, missing fields, wrong
types, retry; (7) use cases — extraction, sentiment, intent classification, product extraction,
transformation, form generation.
Examples: 06-01 Unstructured Response · 06-02 JSON Output Problem · 06-03 Basic Zod Schema ·
06-04 withStructuredOutput() · 06-05 Enum Classification · 06-06 Nested Object · 06-07 Array of Objects ·
06-08 Optional Fields · 06-09 Validate Business Rules · 06-10 Handle Invalid Output
Workshop: AI Product Extractor — "เสื้อสีดำราคา 350 บาท มีไซซ์ M และ L" → object with name, price, color,
sizes, category.
Outcome: use AI output in TypeScript and business logic systematically.

### Part 07 — Runnables & LCEL (Intermediate, 90 min)
Objectives: component composition; data flow; reusable AI pipelines.
Topics: (1) composition — function composition, pipeline, sequential/parallel; (2) Runnable interface —
input/output/config, `invoke()`, `stream()`, `batch()`; (3) LCEL — composing runnables, `pipe()`, prompt →
model → parser; (4) output parsers — `StringOutputParser`, AIMessage → string, parser vs structured output;
(5) `RunnableSequence`; (6) `RunnableLambda` — custom processing, input/output transformation; (7)
`RunnableParallel` — branches, shared input, multiple outputs; (8) `RunnablePassthrough` — forwarding input,
`assign()`; (9) reusable pipelines — modules, reusable chains, error handling; (10) when to use LCEL —
linear workflow, simple composition, parallel; limits; when plain functions; when LangGraph.
Examples: 07-01 Function Composition · 07-02 Prompt pipe Model · 07-03 StringOutputParser ·
07-04 RunnableSequence · 07-05 RunnableLambda · 07-06 RunnableParallel · 07-07 RunnablePassthrough ·
07-08 Multiple-step Pipeline · 07-09 Reusable Pipeline
Workshop: AI Content Processor — article → Summary, Keywords, Sentiment, Suggested Title.
Outcome: compose AI components into reusable pipelines.
Teaching note: don't go deep on every LCEL API; focus on composition and data flow; stateful workflows,
loops and conditionals belong to LangGraph.

### Part 08 — Streaming, Batch & Concurrency (Intermediate, 60–90 min)
Objectives: streaming responses; process many inputs; concurrency and rate limits.
Topics: (1) blocking vs streaming, async, Promise, async iterator; (2) `invoke()` vs `stream()`,
`for await...of`, `AIMessageChunk`, reading/combining chunks, time to first token (TTFT); (3) streaming
pipelines — which components stream and which make streaming wait; (4) `batch()` vs loop vs
`Promise.all()`, client-side batch vs provider batch API; (5) sequential vs concurrent vs parallel,
`maxConcurrency`; (6) rate limits — RPM, TPM, HTTP 429, retry, exponential backoff, concurrency control;
(7) request management — timeout, `AbortController`, cancellation, streaming errors, partial responses;
(8) performance & cost — latency, throughput, token usage, request cost, preventing excessive requests.
Examples: 08-01 invoke() vs stream() · 08-02 Read Streaming Chunks · 08-03 Combine Message Chunks ·
08-04 Streaming Pipeline · 08-05 Batch Processing · 08-06 Sequential vs Concurrent ·
08-07 Limit Concurrency · 08-08 Abort Request · 08-09 Handle Rate Limit
Workshop: streaming CLI chatbot + batch translation of multiple texts.
Outcome: responsive AI apps that handle many requests.

## Module 3 — AI Agent Development
Objective: understand agent internals — tool calling, the agent loop, building agents with LangChain, memory.

### Part 09 — Tools & Tool Calling (Intermediate, 90–120 min)
Topics: LLM limitations (can't call app functions/DB/current data); tools — definition, name, description,
input schema, output; `tool()` with Zod, `tool.invoke()`, sync/async; `bindTools()`, tool choice, model
capability; `AIMessage.tool_calls` (name, args, id, invalid tool calls); executing tools — registry, lookup,
`ToolMessage`, `tool_call_id`, sending results back; multiple tools/calls, sequential vs parallel, matching
ids; tool design (naming, descriptions, schema, read-only vs write, granularity, errors); tool security
(validation, authorization, untrusted args, sensitive data, side effects, destructive ops).
Examples: 09-01 Normal TypeScript Function · 09-02 Create Calculator Tool · 09-03 Execute Tool Directly ·
09-04 Bind Tool to Model · 09-05 Inspect Tool Calls · 09-06 Execute Requested Tool · 09-07 Create ToolMessage ·
09-08 Send Tool Result to Model · 09-09 Multiple Tools · 09-10 Multiple Tool Calls · 09-11 Handle Tool Error
Workshop: AI Assistant with add, subtract, multiply, getWeather, searchProduct, getCurrentDate (mock data
for weather/product).

### Part 10 — Building an Agent Loop from Scratch (Intermediate, 90 min)
Topics: chatbot vs workflow vs agent, agent harness; components (model, messages, tools, loop, state,
termination); execution flow; manual loop with `while`; ReAct pattern (decision/action/observation/final
answer; no need to access private reasoning); sequential/dependent tool calls; parallel tool calls with
`Promise.all()` and id pairing, side-effect caution; termination (no tool calls, max iterations, timeout,
tool error, cancellation, token budget); failure cases (infinite loop, repeated calls, invalid args, tool not
found, wrong tool, excessive tokens).
Examples: 10-01 Single Tool Execution · 10-02 Two-step Tool Execution · 10-03 Manual Agent Loop ·
10-04 Dependent Tool Calls · 10-05 Parallel Tool Calls · 10-06 Maximum Iterations · 10-07 Handle Tool Failures ·
10-08 Logging Agent Execution
Workshop: `while`-loop agent that searches products, checks prices, computes totals using multiple tools.

### Part 11 — Building Agents with LangChain (Intermediate, 90–120 min)
Topics: manual → framework-managed agent; `createAgent()` (model, tools, system prompt, input/output);
`agent.invoke()`, state, final AIMessage; multiple tools (selection, sequential/parallel); system prompt
design; `responseFormat` + Zod → `structuredResponse` (provider vs tool strategy); `agent.stream()` (messages,
state updates, tool updates, progress); config (runtime config, recursion limit, cancellation, errors); agent
design (small and focused, granularity, workflow vs agent, when not to use agents).
Examples: 11-01 First createAgent() · 11-02 Agent with One Tool · 11-03 Agent with Multiple Tools ·
11-04 Agent System Prompt · 11-05 Agent Structured Output · 11-06 Agent Streaming ·
11-07 Agent Execution Updates · 11-08 Agent Error Handling
Workshop: AI Shopping Assistant — search, price, stock, compare, total, structured output.

### Part 12 — Agent Memory & Persistence (Intermediate, 90–120 min)
Topics: memory vs state vs context; short-term/long-term, working context, user preferences; agent state;
threads (`thread_id`); checkpointer, `MemorySaver`, limits of in-memory; PostgreSQL checkpointer, resume,
restart; long-term memory (store, namespace, key/value, cross-thread, preferences, search); context
management (window limit, trimming, filtering, summarization, message-sequence validity); memory security
(user isolation, thread ownership, sensitive info, retention, deletion, cross-user leakage).
Examples: 12-01 Agent without Memory · 12-02 Agent with MemorySaver · 12-03 Same Thread Conversation ·
12-04 Multiple Threads · 12-05 PostgreSQL Checkpointer · 12-06 Resume Conversation ·
12-07 Store User Preferences · 12-08 Retrieve Long-term Memory · 12-09 Trim Conversation ·
12-10 Summarize Conversation
Workshop: Personal AI Assistant — multiple conversations, per-conversation memory, per-user isolation,
preferences, continue after app restart.

## Module 4 — Knowledge & RAG

### Part 13 — Documents, Loaders & Text Splitters (Intermediate, 60–90 min)
Topics: external knowledge (cutoff, private/domain data); `Document` (pageContent, metadata, id, source);
loaders (text, JSON, CSV, PDF, web); metadata; why split, chunk size/overlap, character vs token-aware,
semantic boundaries; `CharacterTextSplitter`, `RecursiveCharacterTextSplitter`, `splitText()`,
`splitDocuments()`, `createDocuments()`, preserving metadata; chunking strategy; preprocessing.
Examples: 13-01 Create Document · 13-02 Load Text File · 13-03 Load JSON File · 13-04 Load CSV File ·
13-05 Load PDF File · 13-06 CharacterTextSplitter · 13-07 RecursiveCharacterTextSplitter ·
13-08 Compare Chunk Sizes · 13-09 Preserve Metadata
Workshop: document processing pipeline — load course documents from many files, split into chunks, keep source metadata.

### Part 14 — Embeddings & Semantic Search (Intermediate, 90 min)
Topics: exact/keyword/full-text/semantic search; vectors; embeddings (embedding model, query vs document
embedding); similarity (cosine, dot product, Euclidean); embedding providers (OpenAI, Google, local,
multilingual, dimension, cost); `embedQuery()`, `embedDocuments()`; manual semantic search, top-K;
limitations. (Course uses Google Gemini embeddings, free tier.)
Examples: 14-01 Basic Vector · 14-02 Simple Cosine Similarity · 14-03 Initialize Embedding Model ·
14-04 embedQuery() · 14-05 embedDocuments() · 14-06 Compare Text Similarity · 14-07 Manual Semantic Search ·
14-08 Top-K Search · 14-09 Compare Keyword and Semantic Search
Workshop: Semantic Product Search — "อุปกรณ์สำหรับเขียนโปรแกรม" finds Laptop, Mechanical Keyboard, Monitor.

### Part 15 — Vector Stores & Retrievers (Intermediate, 90–120 min)
Topics: vector store/database, index, similarity search; `MemoryVectorStore` (`fromTexts`, `fromDocuments`,
`addDocuments`, `similaritySearch`, `similaritySearchWithScore`); metadata filtering; PostgreSQL + pgvector;
index concepts (exact vs ANN, HNSW, IVFFlat); document lifecycle (insert/update/delete/ids/dedupe/re-index);
retrievers (`asRetriever()`, `retriever.invoke()`, top-K, filters); strategies (similarity, MMR, filters,
score threshold, hybrid); retrieval quality (recall/precision, chunk size, top-K, evaluation).
Examples: 15-01 MemoryVectorStore · 15-02 Add Documents · 15-03 Similarity Search ·
15-04 Similarity Search with Score · 15-05 Metadata Filtering · 15-06 Create Retriever ·
15-07 Retrieve Documents · 15-08 PostgreSQL pgvector Setup · 15-09 Persistent Vector Store ·
15-10 Update and Delete Documents · 15-11 Compare Retrieval Strategies
Workshop: persistent semantic search over lesson data with PostgreSQL + pgvector.

### Part 16 — Retrieval-Augmented Generation (Intermediate–Advanced, 120 min)
Topics: RAG, hallucination, cutoff, private/domain knowledge; prompt context vs RAG vs fine-tuning vs tool
calling; architecture (indexing, retrieval, generation pipelines); basic two-step RAG (function and LCEL);
RAG prompt design (context boundary, unknown-answer handling, sources); RAG with sources/citations;
agentic RAG (retrieval as a tool, multiple retrieval calls, basic vs agentic); improvements (query
rewriting, filtering, top-K tuning, reranking, hybrid); limitations (poor retrieval, missing info,
conflicting sources, outdated docs, context overflow, indirect prompt injection); evaluation (relevance,
groundedness, faithfulness, citation accuracy).
Examples: 16-01 Manual Context Injection · 16-02 Basic Retrieval · 16-03 Basic RAG with Function ·
16-04 RAG with LCEL · 16-05 RAG Prompt Template · 16-06 RAG with Source Metadata ·
16-07 Unknown Answer Handling · 16-08 Retrieval Tool · 16-09 Agentic RAG · 16-10 Query Rewriting ·
16-11 Evaluate RAG Response
Workshop: AI Knowledge Base for school curriculum documents — multi-file load, chunk, embed, store in
pgvector, retrieve, answer with sources, say "not found" when evidence is insufficient.

## Module 5 — Production AI

### Part 17 — Agent Middleware & Human-in-the-Loop (Advanced, 120 min)
Topics: middleware & cross-cutting concerns; agent lifecycle (before agent/model, model, after model, tool,
after agent); `createMiddleware()` hooks (`beforeModel`, `afterModel`, `wrapModelCall`, `wrapToolCall`);
use cases (logging, validation, error handling, token monitoring); dynamic model selection; dynamic prompt
(runtime context, role, preferences); dynamic tool selection (role-based, read-only vs write); reliability
(retry, fallback, timeout, call limits, budget); guardrails (input/output/tool, PII, injection, business
rules); human-in-the-loop (interrupt, checkpoint, resume, approve/edit/reject); approval workflow
(read/write/destructive); security (authz, least privilege, audit log, duplicate execution; middleware is
not a substitute for backend authorization).
Examples: 17-01 Basic Middleware · 17-02 beforeModel · 17-03 afterModel · 17-04 wrapModelCall ·
17-05 wrapToolCall · 17-06 Dynamic Prompt · 17-07 Dynamic Model Selection · 17-08 Dynamic Tool Selection ·
17-09 Model Retry and Fallback · 17-10 Tool Call Limit · 17-11 Human Approval · 17-12 Interrupt and Resume
Workshop: AI Task Management Agent — read instantly, add/edit per permission, approval before delete, audit
history, tool-call limit.

### Part 18 — Testing, Debugging & Evaluation (Advanced, 90–120 min)
Topics: testing vs evaluation; strategy (unit, integration, e2e, behavioral, regression); tool unit tests;
model testing (mock chat model, fixed responses, simulated tool calls/errors, structured output); agent
testing; RAG testing; debugging (logging, message/state inspection, token usage); LangSmith (tracing, trace,
run, thread, project, observability; env vars; tracing models/tools/agents/RAG); evaluation (datasets,
test cases, reference vs actual answers, criteria, score; exact match, rule-based, schema, tool-call, human,
LLM-as-a-judge and its limits); security tests; performance evaluation; regression evaluation.
Examples: 18-01 Unit Test Tool · 18-02 Test Tool Validation · 18-03 Mock External API · 18-04 Mock Chat Model ·
18-05 Test Structured Output · 18-06 Test Agent Tool Calls · 18-07 Test Agent Side Effects ·
18-08 Enable LangSmith Tracing · 18-09 Inspect Agent Trace · 18-10 Create Evaluation Dataset ·
18-11 Rule-based Evaluator · 18-12 LLM-based Evaluator · 18-13 Regression Evaluation
Workshop: evaluation suite for an AI agent — general questions, tool selection, tool args, structured
output, unauthorized operation, prompt injection, termination, token cost.

### Part 19 — Backend Integration & Production Architecture (Advanced, 120–180 min)
Topics: architecture (frontend/backend/AI service/agent runtime/business logic/DB/provider); separation of
concerns (controller/service/repository/agent service/tool adapter); NestJS integration (AI module,
controller, service, providers, DI, config); agent service; tool integration (adapters, business rules);
Prisma + PostgreSQL (repository, CRUD, transactions, idempotency, audit log); authentication (JWT, request
context, passing user context to the agent); authorization (ownership, RBAC, tool authz, row-level
isolation); conversation API; streaming API (SSE, event types, disconnect); runtime context; MCP (client,
server, tools, trust boundary, auth, permissions); production reliability; cost management; production
security; observability; deployment fundamentals.
Examples: 19-01 NestJS AI Module · 19-02 Chat Model Provider · 19-03 Agent Service · 19-04 Chat Controller ·
19-05 Tool calls Business Service · 19-06 Prisma Integration · 19-07 User-scoped Tools · 19-08 Runtime Context ·
19-09 Conversation API · 19-10 SSE Streaming · 19-11 Human Approval Endpoint · 19-12 MCP Tool Integration ·
19-13 Rate Limiting · 19-14 Usage Logging · 19-15 Production Error Handling
Workshop: backend API for the AI Task Management Agent — NestJS, Prisma, PostgreSQL, auth, user-scoped
data, LangChain agent, CRUD tools, conversation persistence, streaming, human approval, usage monitoring,
LangSmith tracing.

## Module 6 — Capstone

### Part 20 — Final Project: AI Personal Task Manager (Advanced, 4–6 h)
Natural-language task manager. Example commands: add "read TypeScript book" tomorrow; what's due today; show
unfinished tasks; mark a task Completed; search Backend-related tasks; summarize this week; delete meeting
tasks; prioritize tasks.
Stack: Next.js + React + TypeScript + Tailwind (frontend); NestJS + REST + SSE (backend); LangChain (chat
model, tools, agent, middleware, structured output); PostgreSQL + Prisma + pgvector; Zod; LangSmith + logging.
Architecture: Frontend → Backend API → Authentication → Agent Service → LangChain Agent (chat model provider,
task tools, knowledge retrieval tool, middleware, checkpointer, long-term memory) → business services →
repository/Prisma → PostgreSQL.
DB: User(id,name,email,passwordHash,createdAt); Task(id,title,description,status,priority,dueDate,userId,
createdAt,updatedAt); Conversation(id,title,threadId,userId,createdAt,updatedAt);
KnowledgeDocument(id,title,source,userId,createdAt); DocumentChunk(id,documentId,content,embedding,metadata);
AuditLog(id,userId,action,resourceType,resourceId,createdAt).
Features: auth (register/login/me); tasks (CRUD, search, filter, summary); conversations (create, list, send,
history, resume, delete); agent (NLU, intent, tool selection, multiple calls, structured output, streaming,
errors); knowledge base (upload, process, embed, store chunks, retrieve, answer with sources).
Tools — read-only: getTasks, getTaskById, searchTasks, getTodayTasks, getOverdueTasks, getTaskSummary,
searchKnowledge; write: createTask, updateTask, completeTask, changeTaskPriority, changeTaskDueDate;
destructive: deleteTask.
Tool requirements: clear name/description, Zod input, validation, authorization, error handling, structured
output; call business services; never trust a model-generated user id (userId comes from authenticated
runtime context); check ownership; deletes need approval.
Memory: `thread_id` per conversation, persistent checkpointer, resume, user preferences, trimming,
summarization. Middleware: logging, tool validation, dynamic prompt, model/tool call limits, model retry,
fallback, human approval. Human-in-the-loop before deleting: identify task, show it, pause agent, wait for
approval, re-check permission, execute, audit-log.
API: POST /auth/register, /auth/login, GET /auth/me; GET/POST /tasks, GET/PATCH/DELETE /tasks/:id;
GET/POST /conversations, GET/DELETE /conversations/:id, GET /conversations/:id/messages;
POST /conversations/:id/chat, /conversations/:id/chat/stream, /conversations/:id/approvals/:approvalId;
GET/POST /documents, DELETE /documents/:id.
Frontend pages: login, register, task dashboard, task detail, chat, conversation history, knowledge base,
settings. Chat UI: message list/input, streaming text, loading/error states, tool-execution indicator,
approval dialog, source references, stop generation.
Testing: unit (task service, tools, validation, authorization); integration (auth API, task API, agent
service, DB, conversation persistence); AI evaluation (tool selection/args, task create/update accuracy,
retrieval relevance, grounded answer, unauthorized-operation prevention, approval enforcement).
Security: key protection, authn/z, data isolation, validation, prompt-injection defense, tool permission,
rate limiting, audit logging, destructive-action approval. Performance: streaming, timeouts, concurrency
control, model/tool call limits, token monitoring, context-window management.
Milestones: 1 project + DB schema · 2 auth + CRUD API · 3 chat model · 4 task tools · 5 AI agent ·
6 structured output · 7 conversation persistence · 8 middleware + human approval · 9 knowledge base + RAG ·
10 streaming API · 11 frontend chat · 12 testing, evaluation, observability · 13 security + deployment.
Final outcome: the learner can do everything listed in the course objectives, end to end.
