// Commission calculation helpers.
// Business rules (boss decisions 2026-04-10):
//   - Commission is calculated from post-discount amount (net, before tip).
//   - Split payment: commission is based on full net amount regardless of method.
//   - Service and product items may have different rates per employee.

import type { Employee, Transaction } from "./types";

/**
 * Commission earned by an employee on a single transaction.
 * Allocates discount proportionally to service vs product items,
 * then applies the employee's per-type commission rate.
 */
export function transactionCommission(tx: Transaction, employee: Employee): number {
  const items = tx.items.filter((i) => i.type !== "voucher_sale");
  const itemsSum = items.reduce((s, i) => s + i.price, 0);
  if (itemsSum === 0) return 0;

  const serviceSum = items.filter((i) => i.type === "service").reduce((s, i) => s + i.price, 0);
  const productSum = items.filter((i) => i.type === "product").reduce((s, i) => s + i.price, 0);

  const netAmount = tx.totalAmount - tx.tipAmount;
  const serviceNet = netAmount * (serviceSum / itemsSum);
  const productNet = netAmount * (productSum / itemsSum);

  return (
    (serviceNet * employee.commissionServicePercent) / 100 +
    (productNet * employee.commissionProductPercent) / 100
  );
}

/**
 * Total commission across multiple transactions for a single employee.
 */
export function sumCommission(transactions: Transaction[], employee: Employee): number {
  return transactions
    .filter((tx) => tx.employeeId === employee.id)
    .reduce((sum, tx) => sum + transactionCommission(tx, employee), 0);
}
