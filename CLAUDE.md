# FORMEN - POS dla salonow fryzjerskich

## Opis

Aplikacja POS (Point of Sale) dla meskich salonow fryzjerskich. Zastepuje stara aplikacje .NET z XML.
Obsluguje sprzedaz uslug i kosmetykow, napiwki, prowizje, bony, ruchy kasowe, zamkniecie zmiany.
Nie integruje sie z drukarka fiskalna (Bingo Online) ani rezerwacjami (Booksy).

## Dokumentacja szczegolowa

- **docs/analytical.md** - procesy biznesowe, role, obiekty domenowe, flow modulow
- **docs/technical.md** - architektura, stack, routing, deploy, testy
- **src/db/schema.sql** - schemat bazy PostgreSQL
- **src/db/seed.sql** - dane testowe DEV
- **TODO.md** - lista zadan
- **changelog.txt** - historia zmian

## Stack

| Warstwa    | Technologia                                 |
| ---------- | ------------------------------------------- |
| Frontend   | Vite + React 19 + TypeScript (strict)       |
| UI         | Mantine UI 9 (createTheme, dark/light mode) |
| Routing    | React Router v7 (SPA)                       |
| Baza       | PostgreSQL (Supabase DEV / MyDevil PROD)    |
| Testy      | Vitest + Testing Library + jsdom            |
| Pre-commit | Husky + lint-staged (Prettier + ESLint)     |

## Srodowiska

| Branch | Baza                  | Hosting      | Adapter    |
| ------ | --------------------- | ------------ | ---------- |
| `dev`  | Supabase DEV (free)   | GitHub Pages | `supabase` |
| `main` | MyDevil PostgreSQL 16 | MyDevil MD1  | `rest`     |

Adapter konfigurowany przez `VITE_DB_ADAPTER` w `.env.development` / `.env.production`.
Trzy adaptery: `mock` (testy), `supabase` (DEV - Supabase JS SDK), `rest` (produkcja - czysty PG przez REST API).

## Struktura katalogow

```
src/
  pages/          - strony (Dashboard, POS, History, Cash, ShiftClose, Admin, AdminPricing, AdminEmployees)
  components/     - komponenty (layout/, pos/, cash/)
  hooks/          - useCart, useMovements, useDbQuery, useDbData
  db/             - warstwa bazy (adapters/, config, client, types, schema.sql, seed.sql)
  lib/            - types.ts (centralne typy), constants.ts (stale)
  data/           - mock dane (employees, services, products, transactions)
```

## Konwencje kodu

- Jezyk kodu: angielski. Jezyk interfejsu: polski
- Mantine components (bez shadcn, bez surowego Tailwind)
- Centralne typy: src/lib/types.ts. Props lokalne przy komponentach
- Centralne stale: src/lib/constants.ts (CASH_TOLERANCE=10, VOUCHER_EXPIRY_MONTHS=12, pluralize())
- Code splitting: React.lazy + Suspense + PageSkeleton
- Walidacja: @mantine/form (useForm + getInputProps)

## Warstwa bazy danych

- Wzorzec adapter w src/db/ (mock / supabase / rest)
- Generyczny hook `useDbQuery<T>` (async fetch z loading/error/refetch)
- Hooki zasobowe: useEmployees, useServices, useProducts, useTodayTransactions, useDailyStats
- Zapis: db.transactions.create() (transaction + items + payment_detail + tip_balance + commission)
- Testy mockuja modul @/db (vi.mock)
- Schemat DB w src/db/schema.sql (standardowy PostgreSQL, bez Supabase-specific)
- RLS wylaczone na DEV

## Kluczowe typy danych

- **Service**: name, price, price_from (bool), duration_minutes (VARCHAR "30-45"), category, description, description_long
- **Product**: name, price, description (bez magazynu)
- **Transaction**: employee_id (nullable dla bonow), items, tip, discount, payment_method, device_id
- **CashMovement**: tip_withdrawal, expense_take, top_up, barber_loan, barber_payback, voucher_sale

## Decyzje szefa (potwierdzone 2026-04-10)

1. Prowizja od split payment - od pelnej kwoty (niezaleznie od metody)
2. Prowizja od rabatu - od kwoty PO rabacie
3. Jeden pracownik = jeden salon
4. Bon wazny 12 miesiecy, reszta zostaje na bonie
5. Cofniecie transakcji - bez limitu czasowego, ostatnia tx az do zamkniecia zmiany
6. Transparentnosc - pracownik widzi kwoty systemowe na ekranie zamkniecia
7. Tolerancja roznic kasowych: do 10 zl (CASH_TOLERANCE)
8. BEZ presetow napiwkow i bonow - tylko pola na kwote
9. BEZ magazynu kosmetykow
10. BEZ powiadomien - szef sam sprawdza
11. Napiwki gotowkowe "do reki" - system NIE sledzi
12. Limit rabatu - brak, szef ufa pracownikom

## Bezpieczenstwo

- **PIN admina** - Panel Szefa (cennik, prowizje, raporty). Wymagany ZAWSZE, nawet na urzadzeniu admin
- **PIN operacyjny** - cofniecie transakcji. Szef moze udostepnic zaufanemu pracownikowi
- Fryzjerzy bez PIN-u (klik na karte = POS)
- Typy urzadzen: personal (telefon fryzjera), station (tablet kasa), admin (telefon szefa)
- Dezaktywacja zamiast usuwania (pracownicy, urzadzenia, uslugi, produkty)

## Fazy

- **Faza 1 (zrealizowana):** MVP z mock danymi, pelny UI, testy, deploy GitHub Pages
- **Faza 2 (w trakcie):** Integracja z PostgreSQL, autoryzacja urzadzen, bony, portfel napiwkow
- **Faza 3:** Raporty miesieczne, drukarka USB, PWA offline, baza klientow

## Pomysly do rozwazenia

1. Dedykowane skeleton per strona
2. Ruchy kasowe: filtr/paginacja
3. Pasek motywacyjny - doprecyzowanie algorytmow (target, Y/Y, rekord)
4. Swipe na transakcji w historii (cofnij, drukuj)
5. Licznik banknotow w zamknieciu zmiany

## Znane braki

Pelna lista w TODO.md. Glowne: brak CI/CD quality gate.
