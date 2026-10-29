import { describe, it, expect } from "vitest";
import {
  normalizePoIdentifier,
  comparePoReference,
} from "../../src/domain/comparison/normalize-po-reference";

describe("normalize-po-reference", () => {
  it("should normalize variants of PO number", () => {
    expect(normalizePoIdentifier("5738")).toBe("5738");
    expect(normalizePoIdentifier("OC 5.738")).toBe("5738");
    expect(normalizePoIdentifier("PEDIDO 005738")).toBe("5738");
    expect(normalizePoIdentifier("O.C. nº 5738")).toBe("5738");
  });

  it("should match PO reference found in NF complementary notes", () => {
    const res = comparePoReference("5738", ["Ref: OC 5.738", "Entrega almoxarifado"]);
    expect(res.status).toBe("match");
    expect(res.foundInInvoice).toBe("Ref: OC 5.738");
  });

  it("should report mismatch when PO reference is missing from NF", () => {
    const res = comparePoReference("5738", ["Entrega imediata", "Sem pedido"]);
    expect(res.status).toBe("mismatch");
    expect(res.severity).toBe("critical");
  });
});
