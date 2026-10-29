import { describe, it, expect } from "vitest";
import {
  parseMoneyToDecimal,
  compareMoneyValues,
  formatBRL,
} from "../../src/domain/comparison/money";

describe("money arithmetic and tolerance", () => {
  it("should parse Brazilian currency formats", () => {
    expect(parseMoneyToDecimal("R$ 1.250,50")?.toString()).toBe("1250.5");
    expect(parseMoneyToDecimal("38,00")?.toString()).toBe("38");
    expect(parseMoneyToDecimal("76.00")?.toString()).toBe("76");
  });

  it("should accept difference within tolerance (up to 0.99)", () => {
    // Diff is 0.50, within 0.99 tolerance
    const res = compareMoneyValues("100.00", "100.50", 0.99);
    expect(res.status).toBe("match");
    expect(res.isWithinTolerance).toBe(true);
  });

  it("should reject difference exceeding tolerance (e.g. 1.05 > 0.99)", () => {
    const res = compareMoneyValues("100.00", "101.05", 0.99);
    expect(res.status).toBe("mismatch");
    expect(res.isWithinTolerance).toBe(false);
  });

  it("should format to BRL correctly", () => {
    const formatted = formatBRL("38.00");
    expect(formatted).toContain("38,00");
  });
});
