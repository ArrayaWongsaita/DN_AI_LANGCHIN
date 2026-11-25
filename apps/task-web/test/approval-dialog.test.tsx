import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { ApprovalDialog } from "@/components/chat/ApprovalDialog";

const actions = [{ name: "deleteTask", args: { id: "t1" } }];

describe("ApprovalDialog", () => {
  test("shows what will be deleted (task title looked up from the id) and the tool name", async () => {
    render(<ApprovalDialog actions={actions} lookupTitle={async () => "ประชุมทีม"} onDecision={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText(/ประชุมทีม/)).toBeInTheDocument();
    expect(screen.getByText(/deleteTask/)).toBeInTheDocument();
  });

  test("approve calls onDecision once with 'approve' and disables the buttons while pending", async () => {
    let resolve!: () => void;
    const onDecision = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<ApprovalDialog actions={actions} onDecision={onDecision} />);
    await userEvent.click(screen.getByRole("button", { name: "อนุมัติ" }));
    await userEvent.click(screen.getByRole("button", { name: "อนุมัติ" })); // กดซ้ำ
    expect(onDecision).toHaveBeenCalledTimes(1);
    expect(onDecision).toHaveBeenCalledWith("approve");
    expect(screen.getByRole("button", { name: "ปฏิเสธ" })).toBeDisabled();
    resolve();
  });

  test("reject calls onDecision once with 'reject'", async () => {
    const onDecision = vi.fn().mockResolvedValue(undefined);
    render(<ApprovalDialog actions={actions} onDecision={onDecision} />);
    await userEvent.click(screen.getByRole("button", { name: "ปฏิเสธ" }));
    expect(onDecision).toHaveBeenCalledOnce();
    expect(onDecision).toHaveBeenCalledWith("reject");
  });

  test("a failed decision shows the server's message and lets the user try again", async () => {
    const onDecision = vi.fn().mockRejectedValueOnce(new Error("งานนี้ไม่มีอยู่แล้ว")).mockResolvedValue(undefined);
    render(<ApprovalDialog actions={actions} onDecision={onDecision} />);
    await userEvent.click(screen.getByRole("button", { name: "อนุมัติ" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("งานนี้ไม่มีอยู่แล้ว");
    await waitFor(() => expect(screen.getByRole("button", { name: "อนุมัติ" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "อนุมัติ" }));
    expect(onDecision).toHaveBeenCalledTimes(2);
  });
});
