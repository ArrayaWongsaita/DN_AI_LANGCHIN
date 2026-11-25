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

## Commands
```bash
pnpm play 4-1                         # รันตัวอย่าง 04-01
pnpm exec tsx --env-file=.env <file>  # รัน workshop solution
pnpm typecheck && pnpm test
```
Groq free tier จำกัด ~30 requests/นาที — รันหลายตัวอย่างติดกันให้เว้นช่วง
