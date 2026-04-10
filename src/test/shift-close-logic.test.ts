import { describe, it, expect } from "vitest";

// ShiftClose business logic (extracted for testing)
function calculateDeposit(cash: number, vouchers: number, float: number): number {
  return Math.max(0, cash - float) + vouchers;
}

function calculateDifference(actualCash: number, expectedCash: number): number {
  return actualCash - expectedCash;
}

describe("ShiftClose - deposit calculation", () => {
  it("should calculate deposit correctly with all positive values", () => {
    expect(calculateDeposit(500, 100, 200)).toBe(400);
  });

  it("should not return negative cash deposit when float exceeds cash", () => {
    expect(calculateDeposit(100, 50, 200)).toBe(50);
  });

  it("should return only vouchers when cash equals float", () => {
    expect(calculateDeposit(200, 100, 200)).toBe(100);
  });

  it("should return zero when no cash and no vouchers", () => {
    expect(calculateDeposit(0, 0, 0)).toBe(0);
  });

  it("should handle zero float", () => {
    expect(calculateDeposit(500, 0, 0)).toBe(500);
  });

  it("should include full voucher amount regardless of float", () => {
    expect(calculateDeposit(0, 300, 200)).toBe(300);
  });
});

describe("ShiftClose - difference calculation", () => {
  it("should return zero when actual matches expected", () => {
    expect(calculateDifference(450, 450)).toBe(0);
  });

  it("should return positive for surplus", () => {
    expect(calculateDifference(500, 450)).toBe(50);
  });

  it("should return negative for shortage", () => {
    expect(calculateDifference(400, 450)).toBe(-50);
  });
});
