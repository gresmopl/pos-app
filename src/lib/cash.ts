// Cash balance calculations shared between ShiftClose and Dashboard.
// Paper vouchers are counted together with cash (decyzja szefa #16 z 2026-04-13).

import type { Transaction, CashMovement } from "./types";

export interface SystemCashSplit {
  systemCash: number; // cash + paper voucher payments
  systemNonCash: number; // card + BLIK payments
}

export function calcSystemCash(transactions: Transaction[]): SystemCashSplit {
  let systemCash = 0;
  let systemNonCash = 0;

  for (const tx of transactions) {
    if (tx.paymentBreakdown && tx.paymentBreakdown.length > 0) {
      for (const pd of tx.paymentBreakdown) {
        if (pd.method === "cash" || pd.method === "voucher") {
          systemCash += pd.amount;
        } else {
          systemNonCash += pd.amount;
        }
      }
    } else if (tx.paymentMethod === "cash" || tx.paymentMethod === "voucher") {
      systemCash += tx.totalAmount;
    } else {
      systemNonCash += tx.totalAmount;
    }
  }

  return { systemCash, systemNonCash };
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
        (m.type === "voucher_sale" && m.paymentMethod === "cash")
    )
    .reduce((sum, m) => sum + m.amount, 0);

  const cashOut = movements
    .filter(
      (m) => m.type === "tip_withdrawal" || m.type === "expense_take" || m.type === "barber_payback"
    )
    .reduce((sum, m) => sum + m.amount, 0);

  return openingBalance + systemCash + cashIn - cashOut;
}
