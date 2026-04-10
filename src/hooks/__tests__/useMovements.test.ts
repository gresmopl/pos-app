import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMovements } from "../useMovements";

beforeEach(() => {
  vi.useFakeTimers();
});

describe("useMovements", () => {
  it("starts with empty movements", () => {
    const { result } = renderHook(() => useMovements());
    expect(result.current.movements).toEqual([]);
    expect(result.current.successMsg).toBeNull();
    expect(result.current.pendingExpenses).toEqual([]);
    expect(result.current.pendingLoans).toEqual([]);
  });

  it("handles tip withdrawal", () => {
    const { result } = renderHook(() => useMovements());
    act(() => result.current.handleTipWithdrawal("1", 50));
    expect(result.current.movements).toHaveLength(1);
    expect(result.current.movements[0].type).toBe("tip_withdrawal");
    expect(result.current.movements[0].amount).toBe(50);
    expect(result.current.successMsg).toContain("50");
  });

  it("handles expense take with pending status", () => {
    const { result } = renderHook(() => useMovements());
    act(() => result.current.handleExpenseTake("1", 100, "Chemia"));
    expect(result.current.movements[0].type).toBe("expense_take");
    expect(result.current.movements[0].status).toBe("pending");
    expect(result.current.pendingExpenses).toHaveLength(1);
  });

  it("handles top up", () => {
    const { result } = renderHook(() => useMovements());
    act(() => result.current.handleTopUp(200, "Drobne"));
    expect(result.current.movements[0].type).toBe("top_up");
    expect(result.current.movements[0].amount).toBe(200);
  });

  it("handles barber loan with pending status", () => {
    const { result } = renderHook(() => useMovements());
    act(() => result.current.handleBarberLoan("1", 30));
    expect(result.current.movements[0].type).toBe("barber_loan");
    expect(result.current.movements[0].status).toBe("pending");
    expect(result.current.pendingLoans).toHaveLength(1);
  });

  it("handles barber payback - creates new entry and settles loan", () => {
    const { result } = renderHook(() => useMovements());
    act(() => result.current.handleBarberLoan("1", 30));
    const loan = result.current.movements[0];
    act(() => result.current.handleBarberPayback(loan));

    expect(result.current.movements).toHaveLength(2);
    expect(result.current.movements[0].type).toBe("barber_payback");
    expect(result.current.movements[1].status).toBe("settled");
    expect(result.current.pendingLoans).toHaveLength(0);
  });

  it("handles voucher sale", () => {
    const { result } = renderHook(() => useMovements());
    act(() => result.current.handleVoucherSale(100, "cash", "BON-001"));
    expect(result.current.movements[0].type).toBe("voucher_sale");
    expect(result.current.movements[0].description).toContain("BON-001");
  });

  it("clears success message after 3 seconds", () => {
    const { result } = renderHook(() => useMovements());
    act(() => result.current.handleTopUp(100, "Test"));
    expect(result.current.successMsg).not.toBeNull();
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.successMsg).toBeNull();
  });

  it("settles expense with final cost", () => {
    const { result } = renderHook(() => useMovements());
    act(() => result.current.handleExpenseTake("1", 100, "Zakupy"));
    const expense = result.current.movements[0];

    act(() => result.current.openSettleModal(expense));
    expect(result.current.settleModal).toBe(true);

    act(() => result.current.setSettleCost(25));
    act(() => result.current.handleSettle());

    expect(result.current.settleModal).toBe(false);
    expect(result.current.movements[0].status).toBe("settled");
    expect(result.current.movements[0].finalCost).toBe(25);
    expect(result.current.pendingExpenses).toHaveLength(0);
  });
});
