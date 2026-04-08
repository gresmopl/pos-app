# FORMEN

System POS (Point of Sale) dla salonow fryzjerskich. Obsluga sprzedazy uslug i kosmetykow, zarzadzanie utargiem, prowizjami, napiwkami i ruchami kasowymi.

## Stack

- **Frontend:** Next.js (App Router) + React + TypeScript
- **UI:** Mantine UI
- **Backend/Baza:** Supabase (PostgreSQL + Auth + Realtime)
- **Hosting:** Vercel

## Uruchomienie

```bash
npm install
npm run dev
```

Aplikacja dostepna pod `http://localhost:3000`

## Struktura

```
src/
  app/           Strony (Next.js App Router)
  components/    Komponenty wielokrotnego uzytku
  data/          Mock dane (Faza 1)
  themes/        Motywy Mantine (createTheme)
  hooks/         Custom React hooks
  lib/           Logika, helpery, typy
```

## Branche

| Branch | Srodowisko | Cel |
|--------|-----------|-----|
| `main` | Vercel produkcja | Stabilna wersja |
| `dev` | Vercel preview | Rozwoj, testowanie |

## Fazy

- **Faza 1** — MVP: prototyp UI z mock danymi (aktualna)
- **Faza 2** — Integracja z Supabase, pelna funkcjonalnosc
- **Faza 3** — Raporty, drukarka USB, PWA offline, eksport

## Licencja

Wszelkie prawa zastrzezone. Kod zrodlowy jest publiczny, ale nie jest udostepniony na licencji open source.
