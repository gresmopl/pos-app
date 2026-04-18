import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock the db module so tests don't hit Supabase
vi.mock("@/db", () => ({
  db: {
    employees: {
      getAll: vi.fn().mockResolvedValue([
        {
          id: "1",
          name: "Jan",
          avatar: "",
          role: "barber",
          todayRevenue: 0,
          todayServices: 0,
          tipBalance: 0,
        },
      ]),
      getById: vi.fn().mockImplementation((id: string) => {
        if (id === "1") {
          return Promise.resolve({
            id: "1",
            name: "Jan",
            avatar: "",
            role: "barber",
            todayRevenue: 0,
            todayServices: 0,
            tipBalance: 0,
          });
        }
        return Promise.resolve(undefined);
      }),
    },
    cashMovements: {
      getToday: vi.fn().mockResolvedValue([]),
      getSince: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((input: Record<string, unknown>) =>
        Promise.resolve({
          id: crypto.randomUUID(),
          type: input.type,
          employeeName:
            input.employeeId === "1" ? "Jan" : input.type === "top_up" ? "Szef" : "Salon",
          amount: input.amount,
          description: input.description,
          timestamp: new Date().toISOString(),
          status: input.status,
        })
      ),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { useMovements } from "../useMovements";

beforeEach(() => {
  vi.useFakeTimers();
});

async function renderAndFlush() {
  const hook = renderHook(() => useMovements());
  // Flush initial getToday() effect
  await act(async () => {});
  return hook;
}

describe("useMovements", () => {
  it("starts with empty movements", async () => {
    const { result } = await renderAndFlush();
    expect(result.current.movements).toEqual([]);
    expect(result.current.successMsg).toBeNull();
    expect(result.current.pendingExpenses).toEqual([]);
  });

  it("handles tip withdrawal", async () => {
    const { result } = await renderAndFlush();
    await act(async () => result.current.handleTipWithdrawal("1", 50));
    expect(result.current.movements).toHaveLength(1);
    expect(result.current.movements[0].type).toBe("tip_withdrawal");
    expect(result.current.movements[0].amount).toBe(50);
    expect(result.current.successMsg).toContain("50");
  });

  it("handles expense take with pending status", async () => {
    const { result } = await renderAndFlush();
    await act(async () => result.current.handleExpenseTake("1", 100, "Chemia"));
    expect(result.current.movements[0].type).toBe("expense_take");
    expect(result.current.movements[0].status).toBe("pending");
    expect(result.current.pendingExpenses).toHaveLength(1);
  });

  it("handles own cash deposit", async () => {
    const { result } = await renderAndFlush();
    await act(async () => result.current.handleOwnCashDeposit("1", 200));
    expect(result.current.movements[0].type).toBe("own_cash_deposit");
    expect(result.current.movements[0].amount).toBe(200);
    expect(result.current.movements[0].employeeName).toBe("Jan");
    expect(result.current.successMsg).toContain("portfela");
  });

  it("handles voucher sale", async () => {
    const { result } = await renderAndFlush();
    await act(async () => result.current.handleVoucherSale(100, "BON-001"));
    expect(result.current.movements[0].type).toBe("voucher_sale");
    expect(result.current.movements[0].description).toContain("BON-001");
  });

  it("clears success message after 3 seconds", async () => {
    const { result } = await renderAndFlush();
    await act(async () => result.current.handleOwnCashDeposit("1", 100));
    expect(result.current.successMsg).not.toBeNull();
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.successMsg).toBeNull();
  });

  it("settles expense with final cost and creates change return entry", async () => {
    const { result } = await renderAndFlush();
    await act(async () => result.current.handleExpenseTake("1", 100, "Zakupy"));
    const expense = result.current.movements[0];

    act(() => result.current.openSettleModal(expense));
    expect(result.current.settleModal).toBe(true);

    act(() => result.current.setSettleCost(25));
    await act(async () => result.current.handleSettle());

    expect(result.current.settleModal).toBe(false);
    // [0] = expense_settle (change returned), [1] = original expense_take (settled)
    expect(result.current.movements[0].type).toBe("expense_settle");
    expect(result.current.movements[0].amount).toBe(75);
    expect(result.current.movements[1].status).toBe("settled");
    expect(result.current.movements[1].finalCost).toBe(25);
    expect(result.current.pendingExpenses).toHaveLength(0);
  });
});
