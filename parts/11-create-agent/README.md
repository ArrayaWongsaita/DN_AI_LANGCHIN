# Part 11 — Building Agents with LangChain

ระดับ: Intermediate · เวลา: 90–120 นาที · ตัวอย่าง: `examples/part-11/` · Workshop: `workshops/part-11/`

## 1. Introduction

Part 10 เขียน agent loop เอง ~40 บรรทัด Part นี้ใช้ **`createAgent()`** ของ LangChain v1 ที่ทำ loop เดียวกัน พร้อม state, streaming, structured output, recursion limit และ checkpointer (Part 12) ให้สำเร็จรูป
สิ่งที่ต้องเข้าใจไม่เปลี่ยน: โมเดลตัดสินใจ → รัน tool → ใส่ผลกลับ → วนจนจบ

## 2. Learning Objectives

เข้าใจว่า `createAgent` ทำอะไรแทนเรา, state ของ agent, system prompt, structured output (`toolStrategy`/`providerStrategy`), stream modes, recursion limit, เมื่อไรไม่ควรใช้ agent
ทำได้: สร้าง agent ด้วยหลาย tool, ตั้ง system prompt, ขอผลเป็น schema, สตรีมข้อความและความคืบหน้า, จัดการ error/recursion/ยกเลิก

## 3. Concept Explanation

### 3.1 Manual loop → `createAgent`
| Part 10 (เขียนเอง) | `createAgent` |
|---|---|
| `runAgentLoop({ model, tools, messages })` | `createAgent({ model, tools, systemPrompt })` |
| `maxIterations` | `recursionLimit` (ตอน `invoke`) — เกินแล้วโยน `GraphRecursionError` |
| `messages` ที่เราจัดการ | state `{ messages }` ที่ agent จัดการและคืนมา |
| `onStep` | `agent.stream(..., { streamMode })` |
| ผลสุดท้ายเป็นข้อความ | + `responseFormat` → `result.structuredResponse` |

### 3.2 การใช้งานพื้นฐาน
```ts
const agent = createAgent({ model, tools: [getWeather], systemPrompt: "…" });
const result = await agent.invoke({ messages: [{ role: "user", content: "…" }] });
result.messages.at(-1); // AIMessage สุดท้าย
```
`invoke` คืน state สุดท้าย (`messages` ทั้งหมด: human → ai(tool_calls) → tool → ai)

### 3.3 System prompt
กำหนดบทบาท ขอบเขต และ **กฎการใช้ tool** ("ต้องค้นก่อนตอบ ห้ามเดาราคา") — มีผลต่อคุณภาพมาก (11-04) แต่ **ไม่ใช่กลไกความปลอดภัย**: การจำกัดสิทธิ์ต้องทำในโค้ดของ tool

### 3.4 Structured output
`responseFormat: toolStrategy(zodSchema)` → agent จบด้วย object ตาม schema ที่ `result.structuredResponse`
- **toolStrategy:** แปลง schema เป็น tool พิเศษที่โมเดล "เรียก" เพื่อส่งคำตอบสุดท้าย — ใช้ได้กับโมเดลที่รองรับ tool calling
- **providerStrategy:** ใช้ structured output ในตัวของ provider (ต้องรองรับ)
(เปรียบเทียบกับ Part 06: ที่นั่นเป็นการเรียกโมเดลครั้งเดียว ที่นี่เป็นผลสุดท้ายของ agent หลายรอบ)

### 3.5 Streaming
| `streamMode` | ได้อะไร |
|---|---|
| `"messages"` | token ทีละชิ้น (`[chunk, metadata]`) — UX แบบแชต |
| `"updates"` | ความคืบหน้าทีละ node (`model_request`, `tools`) — แสดง progress |
| `"values"` | state เต็มหลังแต่ละขั้น |

### 3.6 Config และ error
`invoke(input, { recursionLimit, signal })` · tool พัง → agent ส่ง error ให้โมเดล · โมเดลวนไม่หยุด → `GraphRecursionError` · ผู้ใช้ยกเลิก → `AbortError`

### 3.7 ออกแบบ agent
เล็กและโฟกัส (3–7 tool) · tool ละหน้าที่ · ถ้าลำดับขั้นตอนรู้ล่วงหน้า **ใช้ workflow ธรรมดา ไม่ต้องใช้ agent** · agent เพิ่ม latency/ค่าใช้จ่าย/ความไม่แน่นอน

## 4. Problem Demonstration

Loop ที่เขียนเอง (Part 10) ต้องดูแลเองทั้ง: state, streaming, structured output, ยกเลิก, persistence — และทุกโปรเจกต์ก็เขียนซ้ำ
ลองเทียบ 11-02: agent ที่มี tool เดียวใช้โค้ดไม่กี่บรรทัด:
```
[human] อากาศที่เชียงใหม่เป็นอย่างไร
[ai] ขอ getWeather
[tool] สภาพอากาศเชียงใหม่: อากาศดี 28°C ท้องฟ้าโปร่ง
[ai] สภาพอากาศเชียงใหม่: อากาศดี 28 °C ท้องฟ้าโปร่ง
```

## 5. Solution

ใช้ `createAgent({ model, tools, systemPrompt, responseFormat })` และเลือก stream mode ตามหน้าจอ
Workshop ใช้ tools ใน `src/tools/shopping.ts` (ทดสอบแล้ว) + `buildShoppingAgent(model)`

## 6. Visual Explanation

```mermaid
flowchart LR
  I["{ messages }"] --> M["model_request<br/>(โมเดลตัดสินใจ)"]
  M -- มี tool_calls --> T["tools<br/>(รัน tool)"]
  T --> M
  M -- ไม่มี tool_calls --> R{"responseFormat?"}
  R -- มี --> S["structuredResponse"]
  R -- ไม่มี --> O["state สุดท้าย"]
  S --> O
```

## 7. Coding Examples

รัน `pnpm play 11-N` — บันทึกจาก TokenMe `deepseek-ai/deepseek-v4.1-flash-1017` (11-08 ใช้ scripted model) · ผลจาก LLM คือ *ตัวอย่างผลลัพธ์ — LLM ไม่ได้ตอบเหมือนเดิมทุกครั้ง*


### 11-01 First createAgent()
```
จำนวนข้อความใน state: 2
ชนิดข้อความ: human → ai
คำตอบ: AI agent คือระบบ AI ที่รับรู้บริบทหรือสภาพแวดล้อม แล้วตัดสินใจและลงมือทำตามเป้าหมายโดยอัตโนมัติ  
โดยทั่วไปมันสามารถวางแผนหลายขั้นตอน ใช้เครื่องมือหรือเรียก API และปรับการทำงานจากผลลัพธ์ที่ได้รับ
```
### 11-02 Agent with One Tool — ดูหัวข้อ 4
### 11-03 Agent with Multiple Tools
```

อากาศที่ภูเก็ตเป็นอย่างไร
  tools: getWeather
  ตอบ: สภาพอากาศที่ภูเก็ตตอนนี้ **ฝนตกเล็กน้อย อุณหภูมิ 30°C** 🌧️

如果您需要其他信息，比如查看商品或查询日期，我也可以帮忙。

ค้นหา keyboard ให้หน่อย แล้วบอกวันที่วันนี้ด้วย
  tools: searchProduct → getCurrentDate
  ตอบ: ผลการค้นหาครับ:

**⌨️ Mechanical Keyboard**
- ราคา: 2,490 บาท
- คงเหลือ: 3 ชิ้น

**📅 วันที่วันนี้:** 25 พฤศจิกายน 2026 (2026-11-25)

หากต้องการทราบรายละเอียดเพิ่มเติมหรือสนใจสินค้าอื่น บอกได้เลยครับ
```
### 11-04 Agent System Prompt — ไม่มี vs มี systemPrompt
```

--- ไม่มี systemPrompt ---
มีครับ — ตอนนี้เจอตัวนี้ในระบบ:

**Mechanical Keyboard (คีย์บอร์ดแมคคานิคอล)**
- ราคา: 2,490 บาท
- คงเหลือ: 3 ชิ้น

**คำแนะนำ:** ถ้าคุณกำลังมองหาคีย์บอร์ดพิมพ์งาน/เล่นเกมทั่วไป ตัวนี้เป็นตัวเลือกที่คุ้มและมีของพร้อมส่ง แต่มีสต็อกแค่ 3 ชิ้นเท่านั้น ถ้าสนใจแนะนำให้รีบตัดสินใจครับ

ถ้าอยากให้ช่วยเลือกให้ตรงใจมากขึ้น บอกผมเพิ่มได้เลยว่า:
1. งบประมาณที่ตั้งไว้ประมาณเท่าไหร่
2. ใช้พิมพ์งาน เล่นเกม หรือทั้งสองอย่าง
3. ชอบแบบมีไฟ RGB / ไร้สาย / ขนาดเล็ก (60%, TKL) ไหม

เดี๋ยวผมช่วยเทียบหรือลองค้นหาเพิ่มให้ครับ 🙂

--- มี systemPrompt ---
ตอนนี้ร้านมี Mechanical Keyboard ราคา 2,490 บาท เหลือ 3 ชิ้นค่ะ ขออนุญาตแนะนำตัวนี้เพราะเป็นรุ่นเดียวที่ร้านมีในสต็อกค่ะ สนใจให้มะลิจองไว้ไหมคะ
```
### 11-05 Agent Structured Output
```
structuredResponse: { productName: 'Mechanical Keyboard', price: 2490, inStock: true }
typeof price: number (TypeScript รู้ type จาก schema)
```
### 11-06 Agent Streaming (`streamMode: "messages"`)
```
AI: **อากาศที่ภูเก็ตวันนี้:** ฝนตกเล็กอย่าง อุณหภูมิ 30°C ☔️

**กลอนสั้นๆ ฝากไว้:**

ภูเก็ตวันนี้ฝนตกโปรยปราย
ท้องฟ้าครึ้มเทาคล้ายฝนหนักหนา
อากาศยังร้อนสามสิบองศา
ทะเลเงียบงามตาเมื่อฝนซา

รวมความว่า ฝนปรอยๆ ทั้งวัน อากาศอุ่นๆ ชื้นๆ ยังเที่ยวได้ แต่พกร่มติดตัวไว้จะดีที่สุดครับ 🌂

(ได้ 118 chunks ที่มีข้อความ)
```
### 11-07 Agent Execution Updates (`streamMode: "updates"`)
```
[model_request] ai: ขอ searchProduct, getCurrentDate
[tools] tool: Mechanical Keyboard ราคา 2490 บาท (เหลือ 3 ชิ้น)
[tools] tool: 2026-11-25
[model_request] ai: ได้ผลลัพธ์ทั้งสองอย่างแล้วครับ:

**ผลการค้นหา keyboard**
- Mechanical Keyboard —
```
### 11-08 Agent Error Handling (scripted — ซ้ำได้แน่นอน)
```
(1) tool พัง — agent ส่ง error ให้โมเดลแล้วโมเดลอธิบายผู้ใช้ได้
   human → ai → tool → ai | ขออภัย ระบบค้นข้อมูลขัดข้อง ลองใหม่ภายหลังนะคะ

(2) โมเดลวนขอ tool ไม่หยุด — recursionLimit ตัดให้
   GraphRecursionError: Recursion limit of 6 reached without hitting a stop condition. You can increase the limit 

(3) ผู้ใช้ยกเลิกก่อนเริ่ม
   AbortError: This operation was aborted
```

## 8. Common Mistakes

| ข้อผิดพลาด | สาเหตุ | แก้ |
|---|---|---|
| Groq: `400 … attempted to call tool 'multiply<|channel|>commentary'` (`tool_use_failed`) | gpt-oss บน Groq บางครั้งทำชื่อ tool เพี้ยนตอนขอ tool ในรอบที่สอง (เจอจริงในการทดสอบหลักสูตรนี้ ประมาณครึ่งหนึ่งของบางคำถาม) | error ชั่วคราว → ลองใหม่ (`retryAsync` ใน `src/utils/retry.ts`) หรือใช้โมเดลอื่น (DeepSeek `thinking:false`) |
| Groq: `400 output_parse_failed` ตอนใช้ `responseFormat` | โมเดลพิมพ์ความคิดแทนที่จะเรียก tool ส่งผลลัพธ์ | ลองใหม่เหมือนข้างบน |
| Groq: `429 … tokens per minute (TPM): Limit 8000` | agent ส่ง history + tool schema ซ้ำทุกรอบ ใช้ token มาก | เว้นช่วงระหว่างรัน, ลดจำนวน tool, ใช้ TokenMe (ค่าเริ่มต้น) หรือ DeepSeek ในงานที่ยิงถี่ |
| `GraphRecursionError` | โมเดลวนเกิน `recursionLimit` (ค่าเริ่มต้น 25) | ตั้งเพดานให้เหมาะ + ตรวจ prompt/tool ที่ทำให้วน |
| โมเดล "แปล" คำค้นเป็นอังกฤษแล้วไม่พบสินค้า | โมเดลเลือก args เอง | system prompt: "ใช้ชื่อตามที่ผู้ใช้พิมพ์"; ให้ tool ตอบว่ามีสินค้าอะไรบ้างเมื่อไม่พบ เพื่อให้ลองใหม่ได้ (เจอจริงใน workshop) |
| ใช้ agent กับงานที่ลำดับรู้ล่วงหน้า | ชอบ agent เกินจำเป็น | ใช้ workflow/LCEL |
| `structuredResponse` เป็น `undefined` | ไม่ได้ตั้ง `responseFormat` หรือโมเดลไม่เรียก tool ผลลัพธ์ | ตั้ง `responseFormat`, ตรวจโมเดลรองรับ tool calling |

## 9. Best Practices

- **Reliability:** ตั้ง `recursionLimit` เสมอ; ลองใหม่เฉพาะ error ชั่วคราว; ตรวจ `structuredResponse` อีกครั้งด้วย business rules (Part 06)
- **Security:** limit สิทธิ์ที่ tool, ไม่เชื่อ args; system prompt ไม่ใช่ guardrail
- **Cost:** agent ส่ง history ซ้ำทุกรอบ — จำกัดจำนวน tool/รอบ และตรวจ token
- **Design:** agent เล็กและโฟกัส; tool ที่ error แล้วบอกทางแก้ (เช่นรายชื่อสินค้าที่มี)
- **Testing:** ทดสอบ agent ด้วย scripted model + tool จริง (ดู `tests/part11-shopping.test.ts`) ส่วนคุณภาพคำตอบดูด้วยการรันจริง

## 10. Exercises

**Basic:** เปลี่ยน 11-04 ให้ systemPrompt บังคับตอบเป็นภาษาอังกฤษ แล้วเทียบผล
**Intermediate:** เพิ่ม field `warnings: string[]` ใน schema ของ 11-05 และทดสอบกับสินค้าที่หมด
**Challenge:** เขียน wrapper `runWithBudget(agent, input, { maxToolCalls })` ที่นับ tool call จาก `streamMode: "updates"` แล้วยกเลิกด้วย `AbortController` เมื่อเกิน

## 11. Workshop

ดู [`workshops/part-11/README.md`](../../workshops/part-11/README.md) — AI Shopping Assistant (ค้นหา ราคา สต็อก เปรียบเทียบ รวมยอด ผลลัพธ์แบบ structured)

## 12. Summary

- `createAgent` = agent loop สำเร็จรูป: tools + systemPrompt + (responseFormat)
- ผลลัพธ์: `result.messages`, `result.structuredResponse`; ควบคุมด้วย `recursionLimit`, `signal`
- `streamMode`: `messages` (token), `updates` (progress), `values` (state)
- error ชั่วคราวของ provider (tool_use_failed, 429) ต้องมี retry; ผลลัพธ์ของ agent ต้องตรวจเหมือน input ที่ไม่น่าไว้ใจ
- API: `createAgent`, `toolStrategy`, `agent.invoke`, `agent.stream`, `recursionLimit`

## 13. Knowledge Check

1. (Concept) `recursionLimit` ของ `createAgent` เทียบกับ `maxIterations` ใน Part 10 เหมือน/ต่างกันอย่างไร?
2. (Concept) เมื่อไรควรใช้ workflow แทน agent?
3. (Code reading) ใน 11-08 ข้อ (1) ทำไม tool ที่พังจึงไม่ทำให้ `agent.invoke` โยน error?
4. (Practical) ผู้ใช้ถามหาสินค้าภาษาไทย แต่ agent ค้นด้วยคำภาษาอังกฤษแล้วไม่พบ แก้ได้อย่างไรบ้าง (อย่างน้อย 2 วิธี)?
5. (Practical) โมเดลตอบ `structuredResponse.total` ไม่ตรงกับผลรวมจาก tool — ควรป้องกันอย่างไร?

## 14. Next Part

Part 12 ให้ agent **จำบทสนทนา** ข้ามคำขอและข้ามการรีสตาร์ท ด้วย thread, checkpointer (`MemorySaver`, PostgreSQL) และ long-term memory
