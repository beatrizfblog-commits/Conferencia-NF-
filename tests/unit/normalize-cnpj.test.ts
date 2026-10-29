import { describe, it, expect } from "vitest";
import {
  normalizeCnpj,
  formatCnpj,
  compareCnpj,
} from "../../src/domain/comparison/normalize-cnpj";

describe("normalize-cnpj", () => {
  it("should strip punctuation and spaces", () => {
    expect(normalizeCnpj("25.682.279/0001-61")).toBe("25682279000161");
    expect(normalizeCnpj("  33.228.024/0004-02 ")).toBe("33228024000402");
    expect(normalizeCnpj(null)).toBeNull();
  });

  it("should format 14-digit CNPJ correctly", () => {
    expect(formatCnpj("25682279000161")).toBe("25.682.279/0001-61");
  });

  it("should match identical CNPJs with or without punctuation", () => {
    const res = compareCnpj("25.682.279/0001-61", "25682279000161", "Fornecedor");
    expect(res.status).toBe("match");
    expect(res.severity).toBe("info");
  });

  it("should report critical mismatch for different CNPJs", () => {
    const res = compareCnpj("25.682.279/0001-61", "33.228.024/0004-02", "Fornecedor");
    expect(res.status).toBe("mismatch");
    expect(res.severity).toBe("critical");
  });
});
