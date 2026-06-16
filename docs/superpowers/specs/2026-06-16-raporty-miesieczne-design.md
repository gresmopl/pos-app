# Raporty miesięczne (panel admina) — spec

Data: 2026-06-16
Status: zaakceptowany (brainstorming)
Wersja aplikacji w momencie pisania: 0.1.122

## Cel

Udostępnić szefowi w panelu admina raport za wybrany okres z czterema sekcjami
(rozliczenie pracowników, finanse salonu, kontrola gotówki, trendy) z możliwością
eksportu do pliku Excel (`.xlsx`, 4 arkusze).

Pozycja „Raporty miesięczne" w `src/pages/Admin.tsx` już istnieje jako `disabled` —
ten spec ją aktywuje.

## Decyzje (z sesji brainstormingu)

1. **Zakres sekcji**: wszystkie cztery — pracownicy, finanse, kasa, trendy.
2. **Wybór okresu**: dwa tryby — (a) wybór całego miesiąca, (b) własny zakres dat
   (od–do); po wyborze przycisk „Generuj raport".
3. **Eksport**: tylko plik Excel `.xlsx` (nie CSV, nie wydruk/PDF).
4. **Mechanizm Excela**: biblioteka SheetJS (`xlsx`), ładowana dynamicznie
   (`await import("xlsx")`) tylko przy eksporcie. Cztery arkusze w jednym skoroszycie.

## Architektura

Wzorzec projektu: logika domenowa w `src/lib/` (czysta, testowalna bez bazy),
UI cienki. Strony ładowane przez `React.lazy` w `src/App.tsx`.

| Plik                                | Rola                                                                                        | Akcja  |
| ----------------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| `src/lib/reports.ts`                | Czysta agregacja: `buildReport(...)` → `MonthlyReport`. Zero zależności od DB.              | nowy   |
| `src/lib/reportExport.ts`           | Generowanie `.xlsx`: `await import("xlsx")`, buduje 4 arkusze z `MonthlyReport`.            | nowy   |
| `src/pages/AdminReports.tsx`        | UI: wybór okresu, render 4 sekcji, przycisk eksportu. Pobiera dane przez `db.*.getSince()`. | nowy   |
| `src/lib/__tests__/reports.test.ts` | Testy agregacji (czyste, bez mocków DB).                                                    | nowy   |
| `src/App.tsx`                       | `lazy` import `AdminReports` + `<Route path="/admin/reports">` w `AdminGuard`.              | edycja |
| `src/pages/Admin.tsx`               | Włączenie linku: usunięcie `disabled`, `onClick → navigate("/admin/reports")`.              | edycja |
| `package.json`                      | dodanie zależności `xlsx`.                                                                  | edycja |

## Model danych raportu

```ts
interface ReportPeriod {
  start: string; // ISO, początek okresu (00:00)
  end: string; // ISO, koniec okresu (23:59:59)
  label: string; // np. "Czerwiec 2026" lub "2026-06-01 – 2026-06-15"
}

interface EmployeeReportRow {
  employeeId: string;
  name: string;
  servicesCount: number; // suma quantity items typu "service"
  productsCount: number; // suma quantity items typu "product"
  netRevenue: number; // suma (totalAmount - tipAmount) z tx pracownika
  tips: number; // suma tipAmount
  commission: number; // sumCommission(tx, employee) z lib/commission.ts
}

interface FinanceSummary {
  totalRevenue: number; // NETTO = suma (totalAmount - tipAmount); napiwki w totalTips
  serviceRevenue: number; // suma cen items typu "service" (po rabacie proporcjonalnie? -> patrz plan)
  productRevenue: number; // suma cen items typu "product"
  voucherSales: number; // suma cen items typu "voucher_sale"
  totalDiscounts: number; // suma discountAmount
  totalTips: number; // suma tipAmount
  txCount: number;
}

interface CashRow {
  closedAt: string;
  closingEmployeeName: string;
  difference: number; // + nadpłata / - manko
}

interface CashControl {
  shifts: CashRow[];
  totalDifference: number; // bilans kasowy za okres
}

interface TrendSummary {
  revenueDeltaPercent: number | null; // vs poprzedni okres tej samej długości
  servicesDeltaPercent: number | null;
  bestDay: { date: string; services: number } | null;
}

interface MonthlyReport {
  period: ReportPeriod;
  employees: EmployeeReportRow[];
  finance: FinanceSummary;
  cash: CashControl;
  trend: TrendSummary;
}
```

> Uwaga implementacyjna: ustalić jednoznacznie definicję „przychodu" — przyjmujemy
> **netto = totalAmount − tipAmount** (napiwki liczone osobno), spójnie z regułą
> prowizji w `commission.ts`. Doprecyzować w planie i testach.

## Przepływ danych

1. Szef wybiera tryb (Miesiąc / Zakres dat) i okres, klika „Generuj raport".
2. Strona liczy `start`/`end` okresu, pobiera:
   - `db.transactions.getSince(start)` → filtr klienta do `end`
   - `db.cashMovements.getSince(start)` → filtr do `end` (jeśli potrzebne dla sekcji)
   - `db.dailyReports.getRecent(N)` → filtr do okresu (różnice kasowe)
   - `db.employees.getAll()`
   - dla trendów: dane poprzedniego okresu tej samej długości (drugi `getSince`).
3. `buildReport(...)` agreguje wszystko do `MonthlyReport`.
4. UI renderuje 4 sekcje (karty jak w `Stats.tsx`).
5. „Eksportuj do Excela" → `reportExport.ts` buduje `.xlsx` z 4 arkuszami.

`getSince(start)` + filtr klienta to świadomy kompromis (prostota > optymalność);
przy dużym wolumenie dodalibyśmy `getBetween(start, end)` do adaptera — na teraz YAGNI.

## Eksport Excel

Plik `.xlsx`, arkusze: `Pracownicy`, `Finanse`, `Kasa`, `Trendy`.
Nazwa: `raport_FORMEN_2026-06.xlsx` (miesiąc) lub
`raport_FORMEN_2026-06-01_2026-06-15.xlsx` (zakres).

## Stany brzegowe

- Ładowanie → tekst/spinner (jak w `Stats.tsx`).
- Pusty okres → „Brak danych za wybrany okres"; przycisk eksportu nieaktywny.
- Trendy bez poprzedniego okresu (brak danych) → „—" zamiast wartości %.

## Testy

`src/lib/__tests__/reports.test.ts` — `buildReport` na przykładowych danych:

- sumy finansowe (przychód, usługi/produkty/bony, rabaty, napiwki, liczba tx),
- rozliczenie pracowników + prowizja,
- filtrowanie po zakresie dat (tx poza okresem pomijane),
- bilans kasowy (suma różnic),
- trendy (porównanie do poprzedniego okresu, brak poprzedniego = null),
- pusty okres.

## Poza zakresem (YAGNI na teraz)

- Eksport PDF / wydruk.
- Eksport CSV.
- Nowa metoda `getBetween` w adapterze DB.
- Wykresy graficzne (sekcja trendów to liczby, nie wykresy).
