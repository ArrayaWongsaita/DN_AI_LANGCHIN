import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    // ห้ามส่ง trace ไป LangSmith ตอนรันเทสต์ (free plan มี quota จำกัด)
    env: { LANGSMITH_TRACING: "false" },
  },
});
