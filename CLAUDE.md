# FORMEN - POS dla salonow fryzjerskich

POS dla meskich salonow fryzjerskich (sprzedaz, napiwki, prowizje, bony, kasa, zamkniecie zmiany).
Bez integracji z drukarka fiskalna (Bingo Online) i rezerwacjami (Booksy).

## Dokumentacja

docs/analytical.md (biznes), docs/technical.md (architektura), docs/decisions.md (ADR), docs/conventions.md (konwencje kodu), CONTRIBUTING.md (zasady pracy), src/db/schema.sql (DB), TODO.md (zadania biezace), IDEAS.md (backlog pomyslow), changelog.txt

## Stack

| Warstwa    | Technologia                                  |
| ---------- | -------------------------------------------- |
| Frontend   | Vite + React 19 + TypeScript (strict)        |
| UI         | Mantine UI 9 (createTheme, dark/light mode)  |
| Routing    | React Router v7 (SPA)                        |
| Baza       | PostgreSQL (Supabase DEV / Hetzner VPS PROD) |
| Testy      | Vitest + Testing Library + jsdom             |
| Pre-commit | Husky + lint-staged (Prettier + ESLint)      |

## Srodowiska

| Branch | Baza                        | Hosting          | Adapter    |
| ------ | --------------------------- | ---------------- | ---------- |
| `dev`  | Supabase DEV (free)         | GitHub Pages     | `supabase` |
| `main` | PostgreSQL 16 (self-hosted) | Hetzner CX24 VPS | `rest`     |

`VITE_DB_ADAPTER` w .env: `mock` (testy), `supabase` (DEV), `rest` (PROD). Szczegoly: docs/technical.md

## Struktura

`src/pages/` (strony), `src/components/` (layout/, pos/, cash/), `src/hooks/` (useCart, useDbQuery),
`src/db/` (adaptery, schema), `src/lib/` (types.ts, constants.ts), `src/data/` (mock)

## Konwencje kodu

- Jezyk kodu: angielski. Jezyk interfejsu: polski
- Mantine components (bez shadcn, bez surowego Tailwind)
- Centralne typy: src/lib/types.ts. Props lokalne przy komponentach
- Centralne stale: src/lib/constants.ts (VOUCHER_EXPIRY_MONTHS=12, pluralize())
- Code splitting: React.lazy + Suspense + PageSkeleton
- Walidacja: @mantine/form (useForm + getInputProps)

## Warstwa bazy danych

- Wzorzec adapter w src/db/ (mock / supabase / rest). Schemat: src/db/schema.sql
- Hook `useDbQuery<T>` + hooki zasobowe (useEmployees, useServices, useProducts, useSalonSettings, ...)
- Zapis: db.transactions.create(), db.services._, db.products._, db.cashMovements._, db.salon._, db.devices.\*
- DeviceContext (src/contexts/) - jedyny globalny context (UUID, status urzadzenia)
- Testy mockuja modul @/db (vi.mock). Typy: src/lib/types.ts

## Decyzje szefa (potwierdzone 2026-04-10 i 2026-04-13)

1. Prowizja od split payment - od pelnej kwoty (niezaleznie od metody)
2. Prowizja od rabatu - od kwoty PO rabacie
3. Jeden pracownik = jeden salon
4. Bon wazny 12 miesiecy, reszta zostaje na bonie
5. Cofniecie transakcji - bez limitu czasowego, ostatnia tx az do zamkniecia zmiany
6. Transparentnosc - pracownik widzi kwoty systemowe na ekranie zamkniecia
7. Tolerancja roznic kasowych: brak - pokazuj KAZDA roznice (v2.1)
8. BEZ presetow napiwkow i bonow - tylko pola na kwote
9. BEZ magazynu kosmetykow
10. BEZ powiadomien - szef sam sprawdza (bez emaila/PDF po zamknieciu zmiany)
11. Napiwki gotowkowe "do reki" - system NIE sledzi
12. Limit rabatu - brak, szef ufa pracownikom
13. Prowizja widoczna na biezaco na telefonie fryzjera (personal view)
14. Zmiana stawek prowizji - natychmiastowa, bez harmonogramu
15. Stare bony (papierowe sprzed systemu) - nie wystepuja, bez migracji
16. Bony papierowe przy zamknieciu zmiany liczone razem z gotowka (bez osobnego pola)
17. Wplata do kasy - JEDEN typ dla wszystkich (bez rozroznienia szef/pracownik); kwota zasila kasetke + Portfel pracownika (obsluguje tez sytuacje "fryzjer wydal reszte z wlasnych")

## Bezpieczenstwo

- **PIN admina** (Panel Szefa - ZAWSZE), **PIN operacyjny** (cofniecie tx). Fryzjerzy bez PIN-u
- **Autoryzacja urzadzen**: UUID w localStorage, DeviceGate blokuje aplikacje, szef zatwierdza w /admin/devices
- Typy urzadzen: personal / station / admin. Pierwszy admin auto-approved (PIN 4321)
- Multi-salon: osobna baza per salon (osobny deploy z innym .env), bez RLS

## Claude Code setup (.claude/)

- **Hooki** (auto): ochrona main, ochrona configow, quality check (prettier+tsc), security scan
- **Rules** (auto, scoped): typescript, database, react-mantine, tests
- **Komendy**: `/review`, `/deploy-check`, `/phase-status`
- **Agenty**: ts-reviewer, db-reviewer, test-writer, ux-reviewer
- **MCP**: context7 (aktualne docs Mantine/React/Supabase)

## Fazy

Faza 1 (done) -> Faza 2 (w trakcie) -> Faza 3. Szczegoly: TODO.md, uzyj `/phase-status`
