import { describe, expect, it } from "vitest";
import {
  calculateTotals,
  isValidDate,
  parseDateToNumber,
  sanitizeDate,
  sanitizeMoney,
  sanitizeText,
  toNumber,
} from "./finance";

describe("finance utils", () => {
  it("toNumber parses BR values with thousands", () => {
    expect(toNumber("R$ 1.234,56")).toBeCloseTo(1234.56);
    expect(toNumber("2500")).toBe(2500);
  });

  it("sanitizeMoney keeps only numeric formatting", () => {
    expect(sanitizeMoney("R$ 12a3,4b5")).toBe("123,45");
  });

  it("sanitizeText keeps only letters and spaces", () => {
    expect(sanitizeText("Cofrinho 2025!")).toBe("Cofrinho ");
  });

  it("sanitizeDate formats dd/mm/aaaa", () => {
    expect(sanitizeDate("31122025")).toBe("31/12/2025");
  });

  it("isValidDate rejects invalid dates", () => {
    expect(isValidDate("32/13/9999")).toBe(false);
    expect(isValidDate("29/02/2023")).toBe(false);
    expect(isValidDate("29/02/2024")).toBe(true);
  });

  it("parseDateToNumber normalizes dates for sorting", () => {
    expect(parseDateToNumber("01/01/2024")).toBe(20240101);
    expect(parseDateToNumber("31/12/2025")).toBe(20251231);
    expect(parseDateToNumber("31/02/2024")).toBeNull();
  });

  it("calculateTotals respects paid and cofrinho logic", () => {
    const totals = calculateTotals({
      valorFixo: "1000",
      rendaExtra: "200",
      cofrinho: { enabled: true, value: "200" },
      pagamentos: [
        { id: "1", descricao: "Conta", valor: "100", vencimento: "", pago: true },
        { id: "2", descricao: "Cofrinho extra", valor: "50", vencimento: "", pago: false },
        { id: "3", descricao: "Mercado", valor: "80", vencimento: "", pago: false },
        { id: "4", descricao: "Cofrinho", valor: "40", vencimento: "", pago: true },
      ],
    });

    expect(totals.totalPagos).toBe(100);
    expect(totals.totalAbertos).toBe(130);
    expect(totals.totalCofrinho).toBe(40);
    expect(totals.valorUtilizavel).toBe(1100);
    expect(totals.restanteCofrinho).toBe(240);
  });
});
