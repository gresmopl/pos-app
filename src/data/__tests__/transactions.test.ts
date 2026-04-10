import { describe, it, expect } from "vitest";
import { mockTransactions } from "../transactions";
import { mockEmployees } from "../employees";

describe("mockTransactions", () => {
  it("should have at least one transaction", () => {
    expect(mockTransactions.length).toBeGreaterThan(0);
  });

  it("should have unique IDs", () => {
    const ids = mockTransactions.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should reference valid employee IDs", () => {
    const employeeIds = mockEmployees.map((e) => e.id);
    mockTransactions.forEach((t) => {
      expect(employeeIds).toContain(t.employeeId);
    });
  });

  it("should have positive total amounts", () => {
    mockTransactions.forEach((t) => {
      expect(t.totalAmount).toBeGreaterThan(0);
    });
  });

  it("should have non-negative tip amounts", () => {
    mockTransactions.forEach((t) => {
      expect(t.tipAmount).toBeGreaterThanOrEqual(0);
    });
  });

  it("should have valid payment methods", () => {
    const validMethods = ["cash", "card", "blik", "voucher", "split"];
    mockTransactions.forEach((t) => {
      expect(validMethods).toContain(t.paymentMethod);
    });
  });

  it("should have at least one item per transaction", () => {
    mockTransactions.forEach((t) => {
      expect(t.items.length).toBeGreaterThan(0);
    });
  });

  it("should have valid item types", () => {
    const validTypes = ["service", "product", "voucher_sale"];
    mockTransactions.forEach((t) => {
      t.items.forEach((item) => {
        expect(validTypes).toContain(item.type);
      });
    });
  });
});
