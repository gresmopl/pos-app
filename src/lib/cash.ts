// Cash balance calculations shared between ShiftClose and Dashboard.
// All payments are cash (no payment method distinction).

import type { Transaction, CashMovement } from "./types";

export function calcSystemCash(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
}

export function calcExpectedCash(
  openingBalance: number,
  systemCash: number,
  movements: CashMovement[]
): number {
  const cashIn = movements
    .filter(
      (m) =>
        m.type === "top_up" ||
        m.type === "expense_settle" ||
        m.type === "own_cash_deposit" ||
        m.type === "voucher_sale"
    )
    .reduce((sum, m) => sum + m.amount, 0);

  const cashOut = movements
    .filter(
      (m) => m.type === "tip_withdrawal" || m.type === "expense_take" || m.type === "barber_payback"
    )
    .reduce((sum, m) => sum + m.amount, 0);

  return openingBalance + systemCash + cashIn - cashOut;
}
