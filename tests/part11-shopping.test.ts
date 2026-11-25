import { AIMessage } from "@langchain/core/messages";
import { describe, expect, test } from "vitest";
import { calculateTotal, checkStock, compareProducts, getPrice, searchProducts } from "../src/tools/shopping.js";
import { buildShoppingAgent, shoppingResultSchema } from "../workshops/part-11/solution/shopping-assistant.js";
import { createScriptedChatModel } from "../src/utils/scripted-model.js";

describe("shopping tools", () => {
  test("searchProducts and getPrice", async () => {
    expect(await searchProducts.invoke({ query: "keyboard" })).toContain("Mechanical Keyboard");
    expect(await getPrice.invoke({ name: "Laptop" })).toContain("32900");
  });

  test("searchProducts with no match lists available products so the model can retry", async () => {
    const out = await searchProducts.invoke({ query: "Bluetooth headset" });
    expect(out).toContain("ไม่พบ");
    expect(out).toContain("หูฟังบลูทูธ");
  });

  test("getPrice with a partial name works, unknown name throws", async () => {
    expect(await getPrice.invoke({ name: "หูฟัง" })).toContain("1290");
    await expect(getPrice.invoke({ name: "iPhone" })).rejects.toThrow(/ไม่พบสินค้า/);
  });

  test("ambiguous partial name throws instead of guessing", async () => {
    await expect(getPrice.invoke({ name: "ส" })).rejects.toThrow(/ไม่ชัดเจน|หลายรายการ/);
  });

  test("checkStock reports out-of-stock as 0", async () => {
    const out = JSON.parse(await checkStock.invoke({ name: "Monitor 27 นิ้ว" }));
    expect(out).toMatchObject({ stock: 0, inStock: false });
    expect(JSON.parse(await checkStock.invoke({ name: "Laptop" })).inStock).toBe(true);
  });

  test("compareProducts needs at least two names", async () => {
    await expect(compareProducts.invoke({ names: ["Laptop"] })).rejects.toThrow();
    const out = await compareProducts.invoke({ names: ["Laptop", "Mechanical Keyboard"] });
    expect(out).toContain("Laptop");
    expect(out).toContain("Mechanical Keyboard");
  });

  test("calculateTotal sums lines and reports per-line subtotal", async () => {
    const out = JSON.parse(await calculateTotal.invoke({ items: [{ name: "Mechanical Keyboard", quantity: 2 }, { name: "หูฟังบลูทูธ", quantity: 1 }] }));
    expect(out.total).toBe(6270);
    expect(out.lines[0]).toMatchObject({ quantity: 2, unitPrice: 2490, subtotal: 4980 });
  });

  test("calculateTotal rejects bad quantity and unknown items (never NaN)", async () => {
    await expect(calculateTotal.invoke({ items: [{ name: "Laptop", quantity: 0 }] })).rejects.toThrow();
    await expect(calculateTotal.invoke({ items: [{ name: "Laptop", quantity: 1.5 }] })).rejects.toThrow();
    await expect(calculateTotal.invoke({ items: [{ name: "iPhone", quantity: 1 }] })).rejects.toThrow(/ไม่พบสินค้า/);
    await expect(calculateTotal.invoke({ items: [] })).rejects.toThrow();
  });

  test("calculateTotal refuses quantity above stock", async () => {
    await expect(calculateTotal.invoke({ items: [{ name: "Laptop", quantity: 5 }] })).rejects.toThrow(/คงเหลือ/);
  });
});

describe("buildShoppingAgent", () => {
  test("returns a structuredResponse matching the schema (scripted model)", async () => {
    const model = createScriptedChatModel([
      new AIMessage({ content: "", tool_calls: [{ name: "calculateTotal", args: { items: [{ name: "Laptop", quantity: 1 }] }, id: "t1", type: "tool_call" }] }),
      new AIMessage({
        content: "",
        tool_calls: [{ name: "extract-1", args: { items: [{ name: "Laptop", quantity: 1, unitPrice: 32900 }], total: 32900 }, id: "s1", type: "tool_call" }],
      }),
    ]);
    const agent = buildShoppingAgent(model);
    const r = await agent.invoke({ messages: [{ role: "user", content: "ขอ Laptop 1 เครื่อง" }] });
    expect(shoppingResultSchema.safeParse(r.structuredResponse).success).toBe(true);
    expect(r.structuredResponse.total).toBe(32900);
  });
});
