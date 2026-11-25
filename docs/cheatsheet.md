# LangChain.js Cheatsheet (Parts 01–08)

ทุก snippet ตรวจกับ langchain 1.6.8 / @langchain/core 1.5.1 / zod 4.6.7 — โค้ดเต็มอยู่ใน `examples/part-NN/`

## Models (Part 02–03)
| API | import | ใช้ทำอะไร |
|---|---|---|
| `initChatModel` | `langchain/chat_models/universal` | สร้าง chat model จากชื่อ provider (async) |
| `createChatModel(opts)` | `src/models/index.js` | wrapper ของ repo: เลือก groq/deepseek + ค่าเริ่มต้น (**ต้อง `await`**) |
| `model.invoke(input)` | — | เรียกครั้งเดียว ได้ `AIMessage` |
| options | — | `temperature`, `maxTokens` (gpt-oss: รวม reasoning tokens), `timeout`, `maxRetries`, `reasoningEffort`, `thinking:false` (DeepSeek) |
```ts
const model = await createChatModel({ provider: "groq", maxTokens: 1500 });
const msg = await model.invoke("สวัสดี");
```

## Messages (Part 03–04)
| API | import | หมายเหตุ |
|---|---|---|
| `HumanMessage` / `AIMessage` / `SystemMessage` | `@langchain/core/messages` | role ของข้อความ |
| `trimMessages` | `@langchain/core/messages` | ตัด history ตาม token/จำนวน (เก็บ system, เริ่มที่ human) |
| `messageText(msg)` | `src/utils/text.js` | ดึงข้อความจาก `content` (string หรือ block array) |
```ts
await model.invoke([new SystemMessage("ตอบสั้นๆ"), new HumanMessage("สวัสดี")]);
```
LLM **stateless** — จำบทสนทนาด้วยการส่ง history ทุกครั้ง

## Prompts (Part 05)
| API | import | ใช้ทำอะไร |
|---|---|---|
| `PromptTemplate.fromTemplate` | `@langchain/core/prompts` | template ข้อความเดียว `{var}` |
| `ChatPromptTemplate.fromMessages` | `@langchain/core/prompts` | template หลายบทบาท |
| `MessagesPlaceholder("history")` | `@langchain/core/prompts` | แทรก array ของ messages |
| `FewShotChatMessagePromptTemplate` | `@langchain/core/prompts` | ตัวอย่างสอน (ใช้ `await fewShot.formatMessages({})` ใส่ใน placeholder) |
```ts
const p = ChatPromptTemplate.fromMessages([["system", "แปลเป็น{lang}"], ["human", "{text}"]]);
await p.invoke({ lang: "อังกฤษ", text: "สวัสดี" });
```
แยกข้อมูลผู้ใช้ออกจากคำสั่ง (เช่นใส่ใน `<text>…</text>`) กัน prompt injection

## Structured Output & Zod (Part 06)
| API | ใช้ทำอะไร |
|---|---|
| `z.object/string/number/boolean/array/enum` | นิยาม schema |
| `.optional()` / `.nullable()` / `.describe()` | ไม่มีก็ได้ / null ได้ / อธิบาย field ให้ model |
| `schema.parse` / `safeParse` | ตรวจ (throw / ไม่ throw) |
| `z.infer<typeof schema>` | ได้ TypeScript type |
| `model.withStructuredOutput(schema)` | model ที่ตอบเป็น object ตาม schema |
```ts
const m = (await createChatModel({ provider: "deepseek", thinking: false })).withStructuredOutput(schema);
```
DeepSeek ต้องปิด thinking · schema ตรวจแค่รูปร่าง ต้องตรวจกฎธุรกิจเพิ่ม

## Runnables & LCEL (Part 07)
| API | import (`@langchain/core/…`) | ใช้ทำอะไร |
|---|---|---|
| `a.pipe(b)` | — | ต่อ a → b |
| `StringOutputParser` | `output_parsers` | `AIMessage` → string |
| `RunnableSequence.from([...])` | `runnables` | ลำดับขั้นตอน |
| `RunnableLambda.from(fn)` | `runnables` | ห่อฟังก์ชันธรรมดา |
| `RunnableParallel.from({a, b})` | `runnables` | หลายสาขาขนาน → object |
| `RunnablePassthrough.assign({...})` | `runnables` | เก็บ input เดิม + เพิ่ม field |
| `.withRetry({ stopAfterAttempt })` / `.withFallbacks([...])` | — | retry / ตัวสำรอง |
```ts
const chain = prompt.pipe(model).pipe(new StringOutputParser());
```

## Streaming, Batch, Concurrency (Part 08)
| API | ใช้ทำอะไร |
|---|---|
| `for await (const c of await model.stream(x))` | อ่านทีละ `AIMessageChunk` (`c.content` = ส่วนใหม่) |
| `chunk.concat(next)` | รวม chunk เป็นข้อความเต็ม |
| `chain.batch(inputs, { maxConcurrency })` | หลาย input ขนาน จำกัดจำนวน (ผลเรียงตาม input) |
| `chain.batch(inputs, undefined, { returnExceptions: true })` | รายการที่พังไม่ล้มทั้งชุด |
| `model.stream(x, { signal })` + `AbortController` | ยกเลิกคำขอ |
| backoff (`src/utils/throttled-model.ts` สำหรับทดสอบ) | retry 429/5xx แบบเว้นเวลาเป็นเท่าตัว |

## Tools & Tool Calling (Part 09)
| API | import | ใช้ทำอะไร |
|---|---|---|
| `tool(fn, { name, description, schema })` | `@langchain/core/tools` | สร้าง tool (Zod schema = สัญญาของ args) |
| `model.bindTools!([t1, t2])` | — | ให้โมเดลเห็น tool |
| `ai.tool_calls` → `[{ name, args, id }]` | — | สิ่งที่โมเดล "ขอ" ให้เรียก (ยังไม่ได้รันอะไร) |
| `t.invoke(args)` → string · `t.invoke(toolCall)` → `ToolMessage` | — | รัน tool เอง |
| `new ToolMessage({ content, tool_call_id, status })` | `@langchain/core/messages` | ส่งผลกลับ (`status: "error"` เมื่อพัง) |
| `z.toJSONSchema(schema)` | `zod` | ดู schema ที่โมเดลเห็นจริง |
```ts
const add = tool(async ({ a, b }) => String(a + b), { name: "add", description: "บวกเลข", schema: z.object({ a: z.number(), b: z.number() }) });
const ai = await model.bindTools!([add]).invoke("2+3?");   // ai.tool_calls
```
ข้อควรรู้: Groq gpt-oss ไม่ส่ง parallel tool calls (DeepSeek ส่ง); DeepSeek ต้อง `thinking: false` เมื่อใช้ tools/structured output

## Agent Loop (Part 10)
| API | ใช้ทำอะไร |
|---|---|
| `executeToolCalls(tools, ai)` (`src/agents/execute-tools.ts`) | รัน tool ทุกตัวที่ขอ → `ToolMessage[]` ไม่ throw (ไม่พบ tool / args ผิด / tool พัง → `status: "error"`) |
| `runAgentLoop({ model, tools, messages, maxIterations, onStep })` (`src/agents/agent-loop.ts`) | วน ถามโมเดล → รัน tool → ใส่ผลกลับ จนโมเดลตอบ หรือครบ `maxIterations` |
| ตัวหยุด: ไม่มี `tool_calls` · `maxIterations` · `AbortSignal` | กัน loop ไม่จบ/เสียเงิน |

## createAgent (Part 11)
| API | import | ใช้ทำอะไร |
|---|---|---|
| `createAgent({ model, tools, systemPrompt, responseFormat, checkpointer, store })` | `langchain` | agent loop สำเร็จรูป |
| `agent.invoke({ messages: [...] }, { recursionLimit, signal, configurable })` | — | รัน → `{ messages, structuredResponse? }` |
| `toolStrategy(zodSchema)` / `providerStrategy(zodSchema)` | `langchain` | `responseFormat` → `result.structuredResponse` |
| `agent.stream(input, { streamMode: "messages" \| "updates" \| "values" })` | — | token / ความคืบหน้าทีละ node / state เต็ม |
| `GraphRecursionError` · `AbortError` | — | เกิน `recursionLimit` / ยกเลิก |
| `retryAsync(fn, { attempts, delayMs })` (`src/utils/retry.js`) | — | retry เฉพาะ error ชั่วคราว (Groq 400 `tool_use_failed`/`output_parse_failed`, 429, 5xx, embedding ว่าง) |
```ts
const agent = createAgent({ model, tools, systemPrompt: "…", responseFormat: toolStrategy(schema) });
const r = await agent.invoke({ messages: [{ role: "user", content: "…" }] }, { recursionLimit: 12 });
```

## Memory (Part 12)
| API | import | ใช้ทำอะไร |
|---|---|---|
| `new MemorySaver()` | `@langchain/langgraph` | checkpointer ใน RAM |
| `PostgresSaver.fromConnString(url)` + `.setup()` + `.end()` | `@langchain/langgraph-checkpoint-postgres` | checkpointer ใน PostgreSQL |
| `PostgresStore.fromConnString(url)` + `.setup()` + `.stop()` | `@langchain/langgraph-checkpoint-postgres/store` | long-term memory |
| `new InMemoryStore()` · `BaseStore` | `@langchain/langgraph-checkpoint` | store ใน RAM / interface |
| `{ configurable: { thread_id } }` | — | กุญแจของบทสนทนา (ส่งทุกครั้ง) |
| `checkpointer.getTuple(config)` | — | อ่าน state ที่เก็บ (`agent.getState` เป็น internal) |
| `trimMessages(msgs, { maxTokens, tokenCounter, strategy: "last", startOn: "human" })` | `langchain` | ตัดประวัติโดยไม่ทิ้ง ToolMessage กำพร้า |
| `threadIdFor(user, conv)` · `assertThreadOwner(user, threadId)` (`src/memory/thread-access.ts`) | — | thread ผูกผู้ใช้ + ตรวจสิทธิ์ |
| `savePreference / getPreferences / deletePreferences` (`src/memory/preferences.ts`) | — | preference ต่อผู้ใช้ (namespace `["users", id, "preferences"]`) |
| `withPostgresMemory(({ checkpointer, store }) => …)` (`src/memory/postgres.ts`) | — | เปิด/ปิด saver+store ให้ |

## Documents & Splitters (Part 13)
| API | import | ใช้ทำอะไร |
|---|---|---|
| `new Document({ pageContent, metadata })` | `@langchain/core/documents` | หน่วยข้อมูลของ RAG |
| `TextLoader` · `JSONLoader(path, pointers?)` | `@langchain/classic/document_loaders/fs/text` · `…/json` | txt/md · json |
| `CSVLoader` (ต้อง `d3-dsv`) · `PDFLoader` | `@langchain/community/document_loaders/fs/csv` · `…/pdf` | csv (1 แถว = 1 Document) · pdf (1 หน้า = 1 Document) |
| `RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap, separators })` · `CharacterTextSplitter` | `@langchain/textsplitters` | แบ่งข้อความ (`.splitDocuments(docs)`) |
| `loadCurriculum(dir)` → `{ documents, warnings }` · `chunkDocuments(docs, opts)` (`src/rag/load-curriculum.ts`) | — | โหลดหลายชนิด + แบ่ง chunk + `chunkIndex` |

## Embeddings & Semantic Search (Part 14)
| API | ใช้ทำอะไร |
|---|---|
| `createEmbeddings(task?)` (`src/embeddings/index.ts`) | Gemini `gemini-embedding-001` 768 มิติ; `task`: `"RETRIEVAL_DOCUMENT"` / `"RETRIEVAL_QUERY"` |
| `emb.embedQuery(text)` → `number[]` · `emb.embedDocuments(texts)` → `number[][]` | embed คำค้น / เอกสารเป็น batch |
| `cosineSimilarity` · `dotProduct` · `euclideanDistance` (`src/utils/similarity.ts`) | วัดความคล้าย (cosine = ค่าเริ่มต้น) |
| `semanticSearch({ query, documents, embeddings, queryEmbeddings?, topK, minScore })` (`src/rag/semantic-search.ts`) | ค้นตามความหมายแบบ manual |
| `createFakeEmbeddings()` (`src/embeddings/fake.ts`) | embedding ปลอม deterministic สำหรับเทสต์ |
ข้อควรรู้: Gemini free tier โควตาเต็ม → **คืน vector ว่างโดยไม่ throw**; คะแนน cosine อัดกันแคบ ~0.5–0.7 ต้อง calibrate threshold

## Vector Stores & Retrievers (Part 15)
| API | import | ใช้ทำอะไร |
|---|---|---|
| `MemoryVectorStore.fromDocuments(docs, emb)` · `.similaritySearch(q, k, filterFn)` · `.similaritySearchWithScore` | `@langchain/classic/vectorstores/memory` | store ใน RAM (score = similarity) |
| `PGVectorStore` | `@langchain/community/vectorstores/pgvector` | pgvector (score = *distance* ยิ่งน้อยยิ่งใกล้) |
| `createPgVectorStore({ embeddings, tableName, pool })` · `resetTable(name)` (`src/rag/pg-store.ts`) | — | สร้าง/ตรวจตาราง `vector(768)` · ลบตาราง |
| `upsertDocuments(store, docs)` · `deleteBySource(store, source)` · `documentId(doc)` | — | index แบบ idempotent (id = sha256 → uuid) · ลบตามไฟล์ |
| `store.similaritySearchVectorWithScore(vec, k, { subject: "math" })` · `store.maxMarginalRelevanceSearch(q, { k, fetchK, lambda })` | — | ค้น + filter · MMR (ลดผลซ้ำ) |
| `store.asRetriever({ k, filter })` → Runnable (`invoke`, `batch`) | — | retriever มาตรฐาน |
ความปลอดภัย: ชื่อตาราง (`assertTableName`) และ *คีย์* ของ filter ถูกต่อเข้า SQL — ต้องมาจากโค้ด ไม่ใช่ผู้ใช้

## RAG (Part 16)
| API (`src/rag/rag.ts`, `src/rag/curriculum-index.ts`) | ใช้ทำอะไร |
|---|---|
| `NOT_FOUND_ANSWER` | คำตอบมาตรฐานเมื่อไม่มีหลักฐาน |
| `formatContext(docs)` | `<context>[1] (source) …</context>` (ปิดกรอบก่อนไม่ได้) |
| `buildRagPrompt()` | system = กฎ 4 ข้อ · human = context + คำถาม |
| `answerWithRag({ question, retriever, model, minDocs })` → `{ answer, sources, usedContext }` | RAG สองขั้น; ไม่มีเอกสาร → ไม่เรียกโมเดล |
| `indexCurriculum({ embeddings, pool })` · `createCurriculumRetriever(store, { queryEmbeddings, k, maxDistance })` | index แบบ idempotent · retriever ที่ตัดผลไกลเกิน |
```ts
const r = await answerWithRag({ question, retriever, model });   // r.answer, r.sources
```

## Middleware & Human-in-the-Loop (Part 17)
| API | ใช้ทำอะไร |
|---|---|
| `createMiddleware({ name, beforeAgent, beforeModel, wrapModelCall, afterModel, wrapToolCall, afterAgent, stateSchema })` | ชั้นคั่นรอบ agent loop; `before*/after*` คืน state update หรือ `undefined`; `beforeModel: { canJumpTo: ["end"], hook }` + `jumpTo: "end"` = จบทันที |
| `createAgent({ contextSchema, middleware: [A, B] })` + `invoke(input, { context })` | runtime context (ไม่เก็บใน state); ตัวแรกใน array = ชั้นนอกสุด |
| `request.runtime.context` (middleware) · `tool(fn, …)` พารามิเตอร์ที่ 2 `.context` (tool) | อ่าน `userId`/`role` ที่ระบบส่งมา |
| `modelRetryMiddleware` · `modelFallbackMiddleware(model)` · `toolCallLimitMiddleware({ runLimit, exitBehavior })` · `modelCallLimitMiddleware` | reliability สำเร็จรูป |
| `humanInTheLoopMiddleware({ interruptOn: { deleteTask: { allowedDecisions } } })` | หยุดรออนุมัติ (ต้องมี checkpointer + thread_id) |
| `r.__interrupt__[0].value.actionRequests` · `agent.invoke(new Command({ resume: { decisions: [{ type: "approve" }] } }), config)` | อ่านคำขอ / resume (`approve` · `edit` + `editedAction` · `reject` + `message`) |
| `src/middleware/*` (`createApprovalMiddleware`, `createRoleBasedToolMiddleware`, `createAuditMiddleware` …) | ชุดที่ใช้ซ้ำใน Part 17–20 |
```ts
const agent = createAgent({ model, tools, contextSchema, checkpointer,
  middleware: [createToolErrorMiddleware(), createAuditMiddleware(audit), createRoleBasedToolMiddleware(),
               ...createApprovalMiddleware({ requireFor: ["deleteTask"], recheck })] });
```
ข้อควรจำ: middleware หลายตัวทำให้นับ step ของกราฟเพิ่ม → `recursionLimit` ต้องสูงขึ้น (เพดานจริงคือ call limit) · middleware ≠ authorization

## Testing & Evaluation (Part 18)
| API | ใช้ทำอะไร |
|---|---|
| `tool.invoke(input, { context: { userId } })` | unit test tool ตรงๆ (ไม่ต้องมี model) |
| `createScriptedChatModel([...AIMessage])` → `.seenMessages`, `.calls` | model ปลอม (ส่งคืน `AIMessageChunk` เพื่อใช้กับ `withStructuredOutput` ได้) |
| `createFakeWeatherApi({ failTimes })` · `createFlakyModel(model, n)` | API/model ปลอมที่ล้มตามสั่ง |
| `assertTrajectory(messages, [{ name, args? }], { ordered })` · `extractToolCalls` | ตรวจลำดับ tool call |
| `runEval(cases, runAgent, evaluators)` → `{ pass, total, byCase }` | รันชุดทดสอบ (agent พังกรณีหนึ่งไม่ล้มทั้งชุด) |
| evaluators: `toolSelection` `toolArgs` `ruleBased` `schemaValid` `mutations` `approvalGate` `terminated` `tokenBudget` `llmJudge(model)` | ตรวจต่างมิติ; คืน `null` = ไม่เกี่ยว |
| `requireLangSmith()` · `withTracingGuard(fn)` | เปิด tracing เฉพาะเมื่อมี key / ไม่ให้ error ของ LangSmith ทำ agent พัง |
| `new Client()` (`langsmith`) → `hasDataset`, `createDataset`, `createExamples`, `listExamples`, `readRun` | dataset / อ่าน trace |
| `evaluate(target, { data, evaluators, experimentPrefix, maxConcurrency })` (`langsmith/evaluation`) | รัน experiment; evaluator รับ `{ inputs, outputs, referenceOutputs }` |
| config ตอน invoke: `{ runName, tags, metadata, runId }` | ตั้งชื่อ/กรอง/อ้างอิง trace |
| `await awaitAllCallbacks()` (`@langchain/core/callbacks/promises`) | รอ trace ส่งก่อนโปรแกรมจบ |
env: `LANGSMITH_API_KEY` · `LANGSMITH_TRACING=true|false` · `LANGSMITH_PROJECT` · `EVAL_PROVIDER=deepseek` (ตัวอย่าง 18-12/13)
ข้อควรจำ: free plan จำกัด trace → ปิดเป็นค่าเริ่มต้น; ผลวัดที่ไม่ครบ (429) ห้ามอ่านเป็นผ่าน; Groq free มีโควตา **รายวัน** 200,000 token

## Docker / PostgreSQL / Gemini setup (Phase 2)
```bash
docker compose up -d --wait        # pgvector/pgvector:0.8.0-pg17 พอร์ต 5435 (pnpm db:up)
docker compose down                # หยุด (ข้อมูลอยู่ใน volume pgdata); เพิ่ม -v เพื่อลบข้อมูล
# .env:  DATABASE_URL=postgres://langchain:langchain@localhost:5435/langchain_course
#        GOOGLE_API_KEY=...        (Gemini embeddings, free tier)
```
Postgres ไม่ได้รัน → โค้ดตัวอย่างแจ้ง `docker compose up -d`; เทสต์ pgvector (`describe.skipIf`) จะถูกข้ามและแสดง `skipped`

## Commands
```bash
pnpm play 4-1                         # รันตัวอย่าง 04-01
pnpm exec tsx --env-file=.env <file>  # รัน workshop solution
pnpm typecheck && pnpm test
pnpm db:up / pnpm db:down             # เปิด/ปิด PostgreSQL + pgvector (Docker)
```
Groq free tier จำกัด ~30 requests/นาที และ 8,000 tokens/นาที (gpt-oss-20b) · Gemini embeddings free tier มีโควตาต่อนาที — รันหลายตัวอย่างติดกันให้เว้นช่วง
