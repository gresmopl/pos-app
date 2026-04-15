# Zasady pracy z projektem FORMEN POS

## Wymagania

- Node.js 20+
- npm 10+
- Git

## Uruchomienie lokalne

```bash
git clone <repo-url>
cd pos-app
npm install
npm run dev        # http://localhost:5173
```

## Srodowiska i branche

| Branch | Srodowisko  | Baza danych   | Deploy           |
| ------ | ----------- | ------------- | ---------------- |
| `dev`  | Development | Supabase DEV  | GitHub Pages     |
| `main` | Produkcja   | MyDevil PG 16 | MyDevil (reczny) |

- Pracuj na branchu `dev`
- PR do `main` tylko po testach i review
- Nie pushuj bezposrednio do `main`

## Zmienne srodowiskowe

Skopiuj `.env.example` do `.env.development` i uzupelnij wartosci Supabase.
Plik `.env.production` nie jest w repo - tworz lokalnie na potrzeby PROD build.

## Struktura katalogow

```
src/
  pages/          # Strony (lazy-loaded)
  components/     # Komponenty UI (layout/, pos/, cash/)
  hooks/          # Custom hooks (useCart, useDbQuery, useDbData)
  db/             # Warstwa bazy danych (adaptery, schemat)
    adapters/     # mock / supabase / rest
  lib/            # Typy (types.ts), stale (constants.ts)
  contexts/       # DeviceContext
  data/           # Dane mockowe
docs/             # Dokumentacja (analityczna, techniczna, ADR)
```

## Workflow zmian

### 1. Kod

- Jezyk kodu: **angielski**
- Jezyk interfejsu: **polski** (z poprawnymi znakami diakrytycznymi i odmiana liczebnikow)
- TypeScript strict - brak `any` bez uzasadnienia
- Formatowanie: Prettier (uruchamiany automatycznie przez pre-commit hook)
- Linting: ESLint z typescript-eslint

### 2. Komponenty UI

- **Tylko Mantine UI 9** - nie uzywaj shadcn, Tailwind, surowego HTML
- Walidacja formularzy: `@mantine/form` (useForm + getInputProps)
- Code splitting: `React.lazy` + `Suspense` + `PageSkeleton`
- Dark/light mode - testuj oba tryby

### 3. Warstwa bazy danych

Kazda operacja na bazie przechodzi przez adapter (`src/db/`).
**Nigdy** nie wywoluj Supabase SDK bezposrednio z komponentow.

Nowa operacja DB wymaga implementacji we **wszystkich trzech** adapterach:

- `mock` - dane in-memory (dla testow)
- `supabase` - Supabase SDK (development)
- `rest` - REST API (produkcja)

### 4. Testy

```bash
npm test              # Uruchom wszystkie testy
npm run test:watch    # Watch mode
```

- Framework: Vitest + React Testing Library + jsdom
- Testy mockuja baze: `vi.mock('@/db')`
- Plik testowy obok komponentu: `Component.test.tsx`
- Testuj zachowanie, nie implementacje
- Polskie teksty w asercjach (bo UI jest po polsku)

### 5. Commity

- Konwencja: `typ: opis` (np. `feat: dodaj filtr platnosci`, `fix: popraw touch target`)
- Typy: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- Pre-commit hook uruchamia Prettier + ESLint automatycznie
- Podbijaj wersje w `package.json` przy kazdej zmianie
- Aktualizuj `changelog.txt`

### 6. UX

Uzytkownicy systemu nie sa techniczni. Przy kazdej zmianie UI pamietaj:

- **Touch targets min 44px** - ActionIcon min `size="lg"`, Button min `size="sm"`
- **Ikony zawsze z etykieta tekstowa** - same ikony sa niezrozumiale
- **Jeden ekran = jedno zadanie**
- **Loading, error i empty states** obslugiwane w kazdym widoku
- **Brak martwych elementow** - jesli przycisk nie dziala, nie renderuj go

## Pre-commit hooks

Projekt uzywa Husky + lint-staged. Przy kazdym uzyciu `git commit`:

- Prettier formatuje zmienione pliki
- ESLint sprawdza bledy
- TypeScript sprawdza typy

Jesli hook uniemozliwia commit, napraw problem zamiast go omijac (`--no-verify` jest niedozwolone).

## Dokumentacja

| Plik                  | Zawartosc                       |
| --------------------- | ------------------------------- |
| `CLAUDE.md`           | Instrukcje dla Claude Code (AI) |
| `docs/analytical.md`  | Wymagania biznesowe             |
| `docs/technical.md`   | Architektura i konfiguracja     |
| `docs/decisions.md`   | Decyzje architektoniczne (ADR)  |
| `docs/conventions.md` | Konwencje kodowania             |
| `changelog.txt`       | Historia zmian                  |
| `TODO.md`             | Zadania i fazy                  |
