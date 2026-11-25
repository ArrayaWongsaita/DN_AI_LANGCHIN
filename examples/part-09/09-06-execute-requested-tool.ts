// 09-06: Execute Requested Tool
// แนวคิด: เราเป็นผู้รัน tool — ทำ registry (ชื่อ → tool) เพื่อค้นหา tool ตามชื่อที่โมเดลขอ
import type { StructuredToolInterface } from "@langchain/core/tools";
import { createChatModel } from "../../src/models/index.js";
import { add, multiply, subtract } from "../../src/tools/index.js";

const registry = new Map<string, StructuredToolInterface>([add, subtract, multiply].map((t) => [t.name, t]));
const model = (await createChatModel({ maxTokens: 1500 })).bindTools!([...registry.values()]);

const ai = await model.invoke("15 คูณ 4 เท่ากับเท่าไร");
for (const call of ai.tool_calls ?? []) {
  const t = registry.get(call.name);
  if (!t) {
    console.log(`ไม่พบ tool "${call.name}"`);
    continue;
  }
  console.log(`โมเดลขอ ${call.name}(${JSON.stringify(call.args)}) → ผลลัพธ์:`, await t.invoke(call.args));
}
