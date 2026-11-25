import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { MessageList } from "@/components/chat/MessageList";
import { RichText } from "@/components/chat/RichText";

describe("RichText (safe subset of markdown, never raw HTML)", () => {
  test("**bold** and `code` become elements; the markers disappear", () => {
    const { container } = render(<RichText text="ลบงาน **ซื้อกาแฟ** แล้ว รัน `deleteTask`" />);
    expect(container.querySelector("strong")?.textContent).toBe("ซื้อกาแฟ");
    expect(container.querySelector("code")?.textContent).toBe("deleteTask");
    expect(container.textContent).toBe("ลบงาน ซื้อกาแฟ แล้ว รัน deleteTask");
  });

  test("HTML from the model stays text: no script/img/b elements are created", () => {
    const evil = '<script>alert(1)</script><img src=x onerror=alert(1)> <b>x</b> **ok**';
    const { container } = render(<RichText text={evil} />);
    expect(container.querySelector("script, img, b")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
    expect(container.querySelector("strong")?.textContent).toBe("ok");
  });

  test("unmatched markers are left as plain text", () => {
    const { container } = render(<RichText text="2 ** 3 และ ** ค้าง" />);
    expect(container.querySelector("strong")).toBeNull();
    expect(container.textContent).toBe("2 ** 3 และ ** ค้าง");
  });
});

describe("MessageList bubbles", () => {
  const base = { tool: null, streaming: false };
  test("an empty assistant message (turn paused for approval) renders no bubble", () => {
    const { container } = render(<MessageList {...base} messages={[{ id: 1, role: "user", text: "ลบงาน" }, { id: 2, role: "assistant", text: "" }]} />);
    expect(container.querySelectorAll(".border.bg-white")).toHaveLength(0);
  });

  test("while streaming, the empty last assistant message still shows the thinking hint", () => {
    render(<MessageList tool={null} streaming messages={[{ id: 1, role: "user", text: "สวัสดี" }, { id: 2, role: "assistant", text: "" }]} />);
    expect(screen.getByText("กำลังคิด…")).toBeInTheDocument();
  });

  test("user text is not interpreted as markdown", () => {
    const { container } = render(<MessageList {...base} messages={[{ id: 1, role: "user", text: "ลบ **x**" }]} />);
    expect(container.querySelector("strong")).toBeNull();
    expect(container.textContent).toContain("ลบ **x**");
  });
});
