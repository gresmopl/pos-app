import type { Transaction } from "./types";
import { lineSum, countItems } from "./reports";

export type HistoryTypeFilter = "all" | "service" | "product";

export interface HistorySummary {
  serviceCount: number;
  productCount: number;
  tipsTotal: number;
  totalRevenue: number;
}

/**
 * Kwota transakcji pokazywana przy aktywnym filtrze typu.
 *
 * Przy filtrze "Uslugi" albo "Produkty" liczymy sume samych pozycji danego typu,
 * zeby np. "Produkty" nie doliczaly uslug sprzedanych w tej samej wizycie.
 * Uzywane w DWOCH miejscach: w kwocie pojedynczego wiersza i w sumie utargu -
 * dlatego regula mieszka tutaj, a nie w komponencie.
 */
export function transactionAmountFor(tx: Transaction, typeFilter: HistoryTypeFilter): number {
  return typeFilter === "all" ? tx.totalAmount : lineSum(tx, typeFilter);
}

/**
 * Cala arytmetyka dolnej belki podsumowania w Historii sprzedazy.
 *
 * tipsTotal celowo NIE zalezy od typeFilter - napiwek nalezy do calej transakcji,
 * nie do pozycji, wiec nie da sie go podzielic miedzy uslugi i produkty. Komponent
 * ukrywa to pole przy aktywnym filtrze typu zamiast pokazywac mylaca liczbe.
 */
export function summarizeHistory(
  transactions: Transaction[],
  typeFilter: HistoryTypeFilter
): HistorySummary {
  let serviceCount = 0;
  let productCount = 0;
  let tipsTotal = 0;
  let totalRevenue = 0;

  for (const tx of transactions) {
    serviceCount += countItems(tx, "service");
    productCount += countItems(tx, "product");
    tipsTotal += tx.tipAmount;
    totalRevenue += transactionAmountFor(tx, typeFilter);
  }

  return { serviceCount, productCount, tipsTotal, totalRevenue };
}
