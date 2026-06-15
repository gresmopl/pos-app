# FORMEN - POS dla salonow fryzjerskich

POS dla meskich salonow fryzjerskich (sprzedaz, napiwki, prowizje, bony, kasa, zamkniecie zmiany).
Bez integracji z drukarka fiskalna (Bingo Online) i rezerwacjami (Booksy).

## Dokumentacja

docs/analytical.md (biznes), docs/technical.md (architektura), docs/decisions.md (ADR), docs/conventions.md (konwencje kodu), CONTRIBUTING.md (zasady pracy), src/db/schema.sql (DB), TODO.md (zadania biezace), IDEAS.md (backlog pomyslow), changelog.txt, docs/product-owner-questions.md, docs/knowledge-base-archive.md (archiwum usunietego Katalogu Wiedzy)

## Stack

| Warstwa    | Technologia                                                |
| ---------- | ---------------------------------------------------------- |
| Frontend   | Vite + React 19 + TypeScript (strict)                      |
| UI         | Mantine UI 9 (createTheme, dark/light mode)                |
| Routing    | React Router v7 (SPA)                                      |
| Baza       | Supabase DEV / SQLite na Hetzner PROD (planowane, ADR-015) |
| Testy      | Vitest + Testing Library + jsdom                           |
| Pre-commit | Husky + lint-staged (Prettier + ESLint)                    |

## Srodowiska

| Branch | Baza                         | Hosting          | Adapter    |
| ------ | ---------------------------- | ---------------- | ---------- |
| `dev`  | Supabase DEV (free)          | GitHub Pages     | `supabase` |
| `main` | SQLite (planowane, ADR-015)¹ | Hetzner CX22 VPS | `rest`     |

`VITE_DB_ADAPTER` w .env: `supabase` (DEV), `rest` (PROD). Szczegoly: docs/technical.md

¹ PROD docelowo na SQLite (better-sqlite3) + Node/Express + Caddy na Hetzner CX22 wg ADR-015 (supersedes ADR-006). Migracja jeszcze niewdrozona - obecnie `main` deployuje na GitHub Pages z adapterem supabase.

## Struktura

`src/pages/` (15 stron), `src/components/` (layout/BottomNavBar+PageHeader+PinModal, pos/, cash/),
`src/hooks/` (useCart, useDbQuery, useWakeLock), `src/db/` (adaptery, mappers.ts, schema),
`src/lib/` (types.ts, constants.ts, cash.ts, commission.ts, employees.ts)

## Konwencje kodu

- Jezyk kodu: angielski. Jezyk interfejsu: polski
- Mantine components (bez shadcn, bez surowego Tailwind)
- Centralne typy: src/lib/types.ts. Props lokalne przy komponentach
- Centralne stale: src/lib/constants.ts (VOUCHER_EXPIRY_MONTHS=12, pluralize())
- Code splitting: React.lazy + Suspense + PageSkeleton
- Walidacja: @mantine/form (useForm + getInputProps)

## Warstwa bazy danych

- Wzorzec adapter w src/db/ (supabase / rest). Schemat: src/db/schema.sql
- Mappery DB wyodrebnione do src/db/mappers.ts (testowalne bez Supabase, 25 testow)
- Hook `useDbQuery<T>` + hooki zasobowe (useEmployees, useServices, useProducts, useSalonSettings, ...)
- Zapis: db.transactions.create(), db.services._, db.products._, db.cashMovements._, db.salon._, db.devices.\*
- DeviceContext (src/contexts/) - jedyny globalny context (UUID, status urzadzenia, useDeviceRole)
- Testy mockuja modul @/db (vi.mock). Typy: src/lib/types.ts. 66 testow / 7 plikow

## Decyzje szefa (potwierdzone 2026-04-10, 2026-04-13, 2026-05-13)

1. Prowizja od split payment - od pelnej kwoty (niezaleznie od metody)
2. Prowizja od rabatu - od kwoty PO rabacie
3. Jeden pracownik = jeden salon
4. Bon wazny 12 miesiecy, reszta zostaje na bonie
5. Cofniecie transakcji - bez limitu czasowego, ostatnia tx az do zamkniecia zmiany
6. Transparentnosc - pracownik widzi kwoty systemowe na ekranie zamkniecia
7. Tolerancja roznic kasowych: brak - pokazuj KAZDA roznice (v2.1)
8. BEZ presetow PELNYCH kwot dla napiwkow/bonow - tylko pole na kwote. Rabat i napiwek maja przyciski INKREMENTALNE +1/+5/+10/+20 (dodaja do aktualnej kwoty, nie ustawiaja pelnej wartosci) - aktualizacja z 2026-05-13
9. BEZ magazynu kosmetykow
10. BEZ powiadomien - szef sam sprawdza (bez emaila/PDF po zamknieciu zmiany)
11. Napiwki gotowkowe "do reki" - system NIE sledzi
12. Limit rabatu - brak, szef ufa pracownikom
13. Prowizja widoczna na biezaco na telefonie fryzjera (personal view)
14. Zmiana stawek prowizji - natychmiastowa, bez harmonogramu
15. Stare bony (papierowe sprzed systemu) - nie wystepuja, bez migracji
16. Bony papierowe przy zamknieciu zmiany liczone razem z gotowka (bez osobnego pola)
17. Wplata do kasy - JEDEN typ dla wszystkich (bez rozroznienia szef/pracownik); kwota zasila kasetke + Portfel pracownika (obsluguje tez sytuacje "fryzjer wydal reszte z wlasnych")
18. Rabat w POS - tylko kwotowy (procentowy usuniety) - decyzja z 2026-05-13, patrz ADR-011
19. Edytowalna cena jednostkowa - dla produktow I uslug w koszyku (ikona olowka) - NADPISANE 2026-06-15 (wczesniej tylko produkty), patrz ADR-012
20. Kolejnosc pracownikow konfigurowalna (display_order) + opcjonalny badge tekstowy retencji (show_retention_badge); ikona statusu na avatarze zawsze widoczna - decyzja z 2026-05-13, patrz ADR-013

## Bezpieczenstwo

- **PIN admina** (Panel Szefa - ZAWSZE), **PIN operacyjny** (cofniecie tx). Fryzjerzy bez PIN-u
- **Autoryzacja urzadzen**: UUID w localStorage, DeviceGate blokuje aplikacje, szef zatwierdza w /admin/devices
- Typy urzadzen: personal / station / admin. Pierwszy admin auto-approved (PIN 1234)
- Multi-salon: osobna baza per salon (osobny deploy z innym .env), bez RLS

## Claude Code setup (.claude/)

- Katalog `.claude/` zawiera obecnie TYLKO `settings.local.json` (lokalne uprawnienia)
- BRAK hookow, rules, komend i agentow w repo (wczesniejszy opis byl aspiracyjny - nie istnial)
- Jakosc kodu egzekwuja: pre-commit (Husky + lint-staged: prettier + eslint --fix) oraz CI (.github/workflows/ci.yml - lint + tsc + testy)
- Deploy: .github/workflows/deploy.yml (GitHub Pages przy push do main)

## Fazy

Faza 1 (done) -> Faza 2 (w trakcie) -> Faza 3. Szczegoly: TODO.md, uzyj `/phase-status`
