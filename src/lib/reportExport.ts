// Eksport raportu do pliku Excel (.xlsx) z 4 arkuszami.
// SheetJS ładowany dynamicznie (await import) — nie obciąża startu aplikacji.

import type { MonthlyReport } from "./reports";

type Row = Record<string, string | number>;

export interface SheetData {
  pracownicy: Row[];
  finanse: Row[];
  kasa: Row[];
  trendy: Row[];
}

export function buildSheetData(report: MonthlyReport): SheetData {
  const pracownicy: Row[] = report.employees.map((e) => ({
    Pracownik: e.name,
    "Usługi (szt.)": e.servicesCount,
    "Produkty (szt.)": e.productsCount,
    "Przychód netto": e.netRevenue,
    Napiwki: e.tips,
    Prowizja: e.commission,
  }));

  const f = report.finance;
  const finanse: Row[] = [
    { Pozycja: "Przychód netto (łącznie)", Wartość: f.totalRevenue },
    { Pozycja: "Usługi", Wartość: f.serviceRevenue },
    { Pozycja: "Produkty", Wartość: f.productRevenue },
    { Pozycja: "Bony (sprzedaż)", Wartość: f.voucherSales },
    { Pozycja: "Rabaty (suma)", Wartość: f.totalDiscounts },
    { Pozycja: "Napiwki (suma)", Wartość: f.totalTips },
    { Pozycja: "Liczba transakcji", Wartość: f.txCount },
  ];

  const kasa: Row[] =
    report.cash.shifts.length > 0
      ? report.cash.shifts.map((s) => ({
          Data: s.closedAt.slice(0, 10),
          Zamknął: s.closingEmployeeName,
          Różnica: s.difference,
        }))
      : [{ Data: "Brak zamknięć w okresie", Zamknął: "", Różnica: 0 }];
  if (report.cash.shifts.length > 0) {
    kasa.push({ Data: "RAZEM", Zamknął: "", Różnica: report.cash.totalDifference });
  }

  const t = report.trend;
  const trendy: Row[] = [
    { Pozycja: "Zmiana przychodu (%)", Wartość: t.revenueDeltaPercent ?? "—" },
    { Pozycja: "Zmiana liczby usług (%)", Wartość: t.servicesDeltaPercent ?? "—" },
    {
      Pozycja: "Najlepszy dzień",
      Wartość: t.bestDay ? `${t.bestDay.date} (${t.bestDay.services} usł.)` : "—",
    },
  ];

  return { pracownicy, finanse, kasa, trendy };
}

export async function exportReportToExcel(
  report: MonthlyReport,
  fileSuffix: string
): Promise<void> {
  const XLSX = await import("xlsx");
  const data = buildSheetData(report);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.pracownicy), "Pracownicy");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.finanse), "Finanse");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.kasa), "Kasa");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.trendy), "Trendy");
  XLSX.writeFile(wb, `raport_FORMEN_${fileSuffix}.xlsx`);
}
