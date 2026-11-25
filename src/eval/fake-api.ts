/** API สภาพอากาศปลอม — ใช้ทดสอบ tool ที่เรียก API ภายนอกโดยไม่ต้องใช้เน็ตหรือ key */
const CITIES: Record<string, number> = { กรุงเทพ: 34, เชียงใหม่: 28, ภูเก็ต: 30 };

export function createFakeWeatherApi(opts: { failTimes?: number } = {}) {
  const state = { calls: 0 };
  return {
    get calls() {
      return state.calls;
    },
    async getWeather(city: string): Promise<{ city: string; tempC: number }> {
      state.calls++;
      if (state.calls <= (opts.failTimes ?? 0)) throw new Error(`503 service unavailable (ครั้งที่ ${state.calls})`);
      const tempC = CITIES[city];
      if (tempC === undefined) throw new Error(`404 ไม่พบเมือง ${city}`);
      return { city, tempC };
    },
  };
}
