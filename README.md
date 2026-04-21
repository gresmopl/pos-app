# FORMEN

System POS (Point of Sale) dla meskich salonow fryzjerskich. Obsluga sprzedazy uslug i kosmetykow, zarzadzanie utargiem, prowizjami, napiwkami i ruchami kasowymi.

## Stack

- **Frontend:** Vite + React + TypeScript
- **UI:** Mantine UI (wielomotywowa architektura)
- **Routing:** React Router v7 (SPA)
- **Backend/Baza:** Supabase (PostgreSQL + Auth + Realtime) — Faza 2
- **Hosting:** GitHub Pages + Vercel (oba z main)

## Uruchomienie

```bash
npm install
npm run dev
```

Aplikacja dostepna pod `http://localhost:3000`

## Skrypty

| Skrypt            | Opis                         |
| ----------------- | ---------------------------- |
| `npm run dev`     | Serwer deweloperski (Vite)   |
| `npm run build`   | Build produkcyjny            |
| `npm run preview` | Podglad builda produkcyjnego |
| `npm run lint`    | ESLint                       |
| `npm test`        | Testy (vitest)               |

## Struktura

```
src/
  pages/          Strony (Dashboard, POS, History, Cash, ShiftClose, Admin)
  components/     Komponenty wielokrotnego uzytku
    layout/       BottomNavBar, PageHeader, PinModal
    pos/          Komponenty ekranu sprzedazy
    cash/         Komponenty ruchow kasowych
  lib/            Logika, helpery, typy, stale
  hooks/          Custom React hooks
  test/           Konfiguracja testow
```

## Branche

| Branch | Srodowisko            | Cel                |
| ------ | --------------------- | ------------------ |
| `main` | GitHub Pages + Vercel | Stabilna wersja    |
| `dev`  | Lokalne testowanie    | Rozwoj, testowanie |

## Jakosc kodu

- TypeScript strict mode
- ESLint (typescript-eslint) + Prettier
- Pre-commit hooks (husky + lint-staged)
- Testy: vitest + @testing-library/react

## Fazy

- **Faza 1** — MVP: prototyp UI (zakonczona)
- **Faza 2** — Integracja z Supabase, autoryzacja urzadzen, pelna funkcjonalnosc (w trakcie)
- **Faza 3** — Raporty miesieczne, drukarka etykiet, PWA offline, eksport

## Licencja

Wszelkie prawa zastrzezone. Kod zrodlowy jest publiczny, ale nie jest udostepniony na licencji open source. Szczegoly w pliku [LICENSE](./LICENSE).
