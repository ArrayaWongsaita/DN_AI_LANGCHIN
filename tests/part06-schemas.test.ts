import { describe, expect, test } from "vitest";
import { productSchema, validateBusinessRules } from "../workshops/part-06/solution/product-schema.js";

const valid = { name: "เสื้อยืด", price: 350, color: "ดำ", sizes: ["M", "L"], category: "clothing" };

describe("productSchema", () => {
  test("accepts a valid product", () => {
    expect(productSchema.safeParse(valid).success).toBe(true);
  });

  test("rejects price given as a string", () => {
    expect(productSchema.safeParse({ ...valid, price: "350" }).success).toBe(false);
  });

  test("rejects a product with missing sizes", () => {
    const { sizes: _omit, ...rest } = valid;
    expect(productSchema.safeParse(rest).success).toBe(false);
  });

  test("rejects a category outside the allowed enum", () => {
    expect(productSchema.safeParse({ ...valid, category: "weapons" }).success).toBe(false);
  });
});

describe("validateBusinessRules", () => {
  test("returns no errors for a valid product", () => {
    expect(validateBusinessRules(productSchema.parse(valid))).toEqual([]);
  });

  test("flags non-positive price", () => {
    expect(validateBusinessRules({ ...valid, price: 0 } as never)).toContain("price ต้องมากกว่า 0");
  });

  test("requires at least one size for clothing", () => {
    expect(validateBusinessRules({ ...valid, sizes: [] } as never)).toContain("เสื้อผ้าต้องมีอย่างน้อย 1 ไซซ์");
  });

  test("allows empty sizes for non-clothing products", () => {
    expect(validateBusinessRules({ ...valid, category: "home", sizes: [] } as never)).toEqual([]);
  });

  test("flags duplicate sizes and blank size values", () => {
    expect(validateBusinessRules({ ...valid, sizes: ["M", "M"] } as never)).toContain("ไซซ์ซ้ำกัน");
    expect(validateBusinessRules({ ...valid, sizes: [""] } as never)).toContain("มีไซซ์ที่เป็นค่าว่าง");
  });
});
