# Konwencje kodowania - FORMEN POS

## TypeScript

### Strict mode

Projekt uzywa `strict: true`. Konsekwencje:

- Brak `any` bez komentarza uzasadniajacego (uzyj `unknown` + type narrowing)
- Brak non-null assertion `value!` bez wczesniejszego guard
- Brak `as` cast ktory omija sprawdzenia typow
- Explicit return types na eksportowanych funkcjach

### Zmienne

- `const` domyslnie, `let` tylko przy reassignment
- `===` zamiast `==`
- Immutable patterns: spread operator, nie mutacja obiektow/tablic

### Nazewnictwo

- Kod: **angielski** (nazwy zmiennych, funkcji, komponentow, komentarzy technicznych)
- UI: **polski** (etykiety, komunikaty, placeholdery)
- Komponenty: PascalCase (`PaymentModal`, `CartItemList`)
- Hooki: camelCase z prefixem `use` (`useCart`, `useDbQuery`)
- Stale: UPPER_SNAKE_CASE (`VOUCHER_EXPIRY_MONTHS`)
- Pliki komponentow: PascalCase (`PaymentModal.tsx`)
- Pliki hookow: camelCase (`useCart.ts`)

## React

### Komponenty

- Funkcyjne (brak class components)
- Code splitting: `React.lazy` + `Suspense` + `PageSkeleton` dla stron
- Props lokalne przy komponencie (interface w tym samym pliku)
- Typy wspoldzielone: `src/lib/types.ts`
- Stale wspoldzielone: `src/lib/constants.ts`

### Hooks

- Dependency arrays zawsze kompletne w useEffect/useMemo/useCallback
- Brak state update w renderze (infinite loop)
- Kazdy hook danych obsluguje trzy stany: loading, error, empty

### Listy

- Zawsze uzyj unikalnego `key` (nie index)
- Uzywaj `pluralize()` z `constants.ts` dla polskiej odmiany liczebnikow

### Context

- Jedyny globalny context: `DeviceContext` (UUID, status, rola urzadzenia)
- Unikaj prop drilling przez 3+ poziomy - uzyj context lub composition

## Mantine UI

### Obowiazkowe

- **Tylko Mantine** - brak shadcn, brak surowego Tailwind, brak raw HTML
- Walidacja: `@mantine/form` (`useForm` + `getInputProps`)
- Motyw: `createTheme` z dark/light mode

### Rozmiary (ergonomia dotykowa)

| Komponent         | Minimum          | Nigdy                    |
| ----------------- | ---------------- | ------------------------ |
| ActionIcon        | `size="lg"`      | `size="xs"`, `size="sm"` |
| Button            | `size="sm"`      | `size="xs"`              |
| SegmentedControl  | `size="sm"`      | `size="xs"`              |
| Tekst istotny     | `fz="sm"` (14px) | `fz={10}`, `fz={11}`     |
| Tekst drugorzedny | `fz="xs"` (12px) | `fz={10}`                |

### Warianty przyciskow

- Glowna akcja: `variant="filled"` (wyrazisty kolor)
- Drugorzedna: `variant="light"` lub `variant="subtle"`
- Destrukcyjna (usun, cofnij): `color="red"`
- Potwierdzenie: `color="green"`

### Modalne

- Maksymalnie 1 poziom glebokosc (brak modali w modalach)
- Przycisk "Anuluj" ten sam rozmiar co przycisk potwierdzenia
- Destrukcyjne akcje wymagaja potwierdzenia z opisem skutku

### Wspoldzielone formularze/modale

Gdy jeden modal/formularz obsluguje rozne typy danych (np. uslugi i produkty):

- Placeholdery, etykiety i komunikaty bledow **musza** byc dynamiczne, dopasowane do aktualnego kontekstu
- Unikaj generycznych tekstow ("Nowa pozycja") gdy mozesz byc konkretny ("Nowa usluga" / "Nowy produkt")
- Testuj kazdy tryb osobno - latwo przeoczyc ze placeholder "Strzyzenie" nie ma sensu przy dodawaniu produktu

## Warstwa bazy danych

### Adapter pattern

```
src/db/
  adapters/
    supabase.ts   # Supabase SDK (development)
    rest.ts       # REST API (produkcja)
  index.ts        # Eksportuje aktywny adapter
```

- Nowa operacja = implementacja we wszystkich adapterach (supabase + rest)
- Komponenty importuja `db` z `@/db`, nigdy bezposrednio adapter
- Hook `useDbQuery<T>` do odczytu (obsluguje loading/error/refetch)

### SQL

- `bigint` dla ID, `text` dla stringow, `timestamptz` dla dat, `numeric` dla pieniedzy
- Brak `varchar(255)` bez powodu
- Brak `timestamp` bez timezone (zawsze `timestamptz`)
- Indeksy na kolumnach WHERE/JOIN i foreign keys
- Parametryzowane zapytania (brak string concatenation)

### Dane

- Soft delete: flaga `is_active` zamiast DELETE
- Brak `SELECT *` w produkcyjnym kodzie
- Unikaj N+1 query pattern

## Jezyk interfejsu (polski)

### Diakrytyki

Zawsze poprawne polskie znaki: a/e/c/l/n/o/s/z/z. Nigdy "Uslugi" - zawsze "Uslugi".

### Odmiana liczebnikow

Uzywaj `pluralize()` z `src/lib/constants.ts`:

- 1 usluga, 2 uslugi, 5 uslug
- 1 produkt, 2 produkty, 5 produktow

### Prosty jezyk

- Krotkie, jednoznaczne etykiety
- "Zatwierdz" zamiast "Finalizuj transakcje"
- "Cofnij" zamiast "Anuluj operacje i przywroc stan poczatkowy"

## Testy

### Setup

- Vitest + React Testing Library + jsdom
- Testy mockuja baze: `vi.mock('@/db')`
- Plik testowy obok komponentu: `ComponentName.test.tsx`
- Wrapper: `MantineProvider` (wymagany dla komponentow Mantine)

### Zasady

- Testuj zachowanie, nie implementacje
- `userEvent.setup()` dla interakcji (nie `fireEvent`)
- Kolejnosc selektorow: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`
- `async/await` dla interakcji, `waitFor` dla stanu asynchronicznego
- Polskie teksty w asercjach (UI jest po polsku)
- Pattern AAA: Arrange, Act, Assert
- `beforeEach: vi.clearAllMocks()`

## Bezpieczenstwo

- Brak hardkodowanych kluczy (poza anon Supabase w `.env.development`)
- Brak SQL injection (parametryzowane zapytania)
- Brak `dangerouslySetInnerHTML`
- Brak `console.log` w commitowanym kodzie (uzyj `console.error` z prefixem `[ModuleName]`)
