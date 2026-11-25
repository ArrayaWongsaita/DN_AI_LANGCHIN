import { render } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MessageList } from "@/components/chat/MessageList";

describe("MessageList", () => {
  afterEach(() => vi.restoreAllMocks());

  test("auto-scroll effect returns nothing even if the browser's scrollIntoView returns a value (React would crash the page)", () => {
    // เบราว์เซอร์จริงบางตัว/บางเวอร์ชันคืนค่า (เช่น Promise) จาก scrollIntoView; jsdom ไม่มี method นี้ จึงต้องจำลอง
    Element.prototype.scrollIntoView = vi.fn(() => Promise.resolve()) as never;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<MessageList messages={[{ id: 1, role: "user", text: "สวัสดี" }]} tool={null} streaming={false} />);
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/must not return anything besides a function/);
  });
});
