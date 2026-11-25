# เฉลย Workshop 01

| ข้อ | เลือก | เหตุผล |
|---|---|---|
| 1 | A (LLM ตรงๆ) | เรียกครั้งเดียว provider เดียว ไม่มี tool/state — SDK หรือ `fetch` ก็พอ ใช้ LangChain ก็ได้แต่ไม่จำเป็น |
| 2 | B (LangChain) | ต้องใช้ tool calling และอยากสลับ provider — Model Abstraction + tools ของ LangChain ช่วยตรงๆ |
| 3 | C (LangGraph) | ต้อง pause รอคน (อาจเป็นวัน) และวนกลับไปแก้ — ต้องมี state, checkpoint, interrupt, loop |
| 4 | A (LLM ตรงๆ) | งานเล็ก รันครั้งเดียว ไม่ต้องมี framework |
| 5 | C (LangGraph) | ต้องจำสถานะข้ามวัน (persistent state), แตกสาขาตามเงื่อนไข, human approval |

หมายเหตุ: ข้อ 2 บางคนเลือก A ได้ถ้ามั่นใจว่าจะไม่เปลี่ยน provider และ tool น้อยมาก — สิ่งสำคัญคือเหตุผล
