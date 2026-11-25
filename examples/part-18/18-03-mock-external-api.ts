// 18-03: Mock External API
// แนวคิด: tool ที่เรียก API ภายนอกทดสอบด้วย "API ปลอม" ที่ควบคุมได้ — จำลอง 503 แล้วพิสูจน์ว่า retry ทำงานโดยไม่ต้องรอ provider ล่มจริง
import assert from "node:assert/strict";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createFakeWeatherApi } from "../../src/eval/fake-api.js";
import { isMain } from "../../src/utils/is-main.js";
import { retryAsync } from "../../src/utils/retry.js";

type WeatherApi = ReturnType<typeof createFakeWeatherApi>;

/** tool รับ API เข้ามา (dependency injection) — ตอนใช้จริงส่ง client จริง ตอนเทสต์ส่งตัวปลอม */
export function createWeatherTool(api: WeatherApi) {
  return tool(
    async ({ city }) => {
      // retry เฉพาะ 5xx/429 (error ชั่วคราว) — 404 ไม่ควรลองซ้ำ
      const isTransient = (e: unknown) => /^(429|5\d\d)\b/.test((e as Error).message);
      const w = await retryAsync(() => api.getWeather(city), { delayMs: 10, shouldRetry: isTransient });
      return `${w.city} ${w.tempC}°C`;
    },
    { name: "getWeather", description: "ดูอุณหภูมิของเมือง", schema: z.object({ city: z.string() }) },
  );
}

export async function run() {
  const flaky = createFakeWeatherApi({ failTimes: 1 });
  const result = await createWeatherTool(flaky).invoke({ city: "กรุงเทพ" });
  assert.equal(result, "กรุงเทพ 34°C");
  assert.equal(flaky.calls, 2);
  console.log(`✓ ล้ม 1 ครั้งแล้ว retry สำเร็จ: "${result}" (เรียก API ${flaky.calls} ครั้ง)`);

  const down = createFakeWeatherApi({ failTimes: 99 });
  await assert.rejects(createWeatherTool(down).invoke({ city: "กรุงเทพ" }), /503/);
  console.log(`✓ ล่มถาวร → ยอมแพ้หลัง retry (เรียก API ${down.calls} ครั้ง) และโยน error ที่อ่านรู้เรื่อง`);

  const notFound = createFakeWeatherApi();
  await assert.rejects(createWeatherTool(notFound).invoke({ city: "เมืองลับ" }), /404/);
  console.log(`✓ 404 ไม่ถูก retry (เรียก API ${notFound.calls} ครั้ง)`);
  assert.equal(notFound.calls, 1);
  return { result, flakyCalls: flaky.calls, downCalls: down.calls, notFoundCalls: notFound.calls };
}

if (isMain(import.meta.url)) await run();
