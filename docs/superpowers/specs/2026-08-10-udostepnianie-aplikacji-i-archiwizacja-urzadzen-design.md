# Udostępnianie aplikacji (QR) i archiwizacja urządzeń — spec

Data: 2026-08-10
Status: zaakceptowany (brainstorming)
Wersja aplikacji w momencie pisania: 0.1.125

## Cel

Dwie niezależne, ale powiązane tematycznie zmiany w panelu admina:

1. **Strona „Udostępnij aplikację"** — duży kod QR z linkiem do aplikacji, żeby pracownik
   zeskanował go telefonem i od razu trafił na formularz rejestracji urządzenia.
2. **Archiwizacja urządzeń** — możliwość usunięcia urządzenia z listy w `/admin/devices`,
   bo lista zarosła rekordami testowymi (34 pozycje, z czego 8 to realny sprzęt).

Obie zmiany zamykają ten sam cykl: szef pokazuje QR → pracownik się rejestruje →
szef zatwierdza → stare wpisy szef sprząta. Dlatego lądują obok siebie w panelu admina.

## Ustalenia sprzed projektu

Rzeczy, których nie było w kodzie mimo brzmienia zgłoszenia — udokumentowane, żeby
nie wracać do nich przy implementacji:

- **Aplikacja nie ma „menu bocznego"** — nawigacja to `BottomNavBar`, strona `/more`
  („Więcej") i panel admina za PIN-em. Strona QR trafia do panelu admina.
- **Aplikacja nie ma „ekranu logowania"** — `DeviceGate` (`src/components/DeviceGate.tsx`)
  sam wykrywa nieznane urządzenie i pokazuje `RegisterScreen`. Kod QR zawiera więc
  po prostu adres główny aplikacji; żadna dedykowana trasa nie jest potrzebna.
- **Kryterium „czy urządzenie robiło transakcje" jest niedostępne.** Kolumna
  `transaction.device_id` istnieje w `schema.sql:155`, ale insert transakcji
  (`src/db/adapters/supabase.ts:601-612`) nigdy jej nie wypełnia — jest pusta dla całej
  historii. Jedynym sygnałem aktywności urządzenia pozostaje `last_seen_at`.

## Weryfikacja żywej bazy (2026-08-10)

Zapytania wykonane przez właściciela na produkcyjnym projekcie Supabase:

- **`device_registration.is_active` istnieje**: `boolean NOT NULL DEFAULT true`.
  Brak dryfu względem `schema.sql:287`, żadna migracja nie jest potrzebna.
- **34 rekordy, wszystkie o statusie `approved`.** Zero `pending`, zero `blocked`.
  Śmieciem są stare zatwierdzone urządzenia testowe, a nie zalegające zgłoszenia.
- **Rozkład ciszy**: 23 rekordy bez kontaktu od ponad 30 dni, 11 aktywnych w ostatnich
  30 dniach. Żaden rekord nie ma pustego `last_seen_at`.
- **Weryfikacja po nazwach**: próg 30 dni nie kwalifikuje do archiwum ani jednego
  realnie używanego urządzenia (`iPhone 17`, `Salon62c`, `iPhone Salon62c`, `Wiktoria`,
  `Tablet`, `Tomek telefon`, `Gracjan`, `Ewela`).
- **Trzy śmieci przechodzą przez sito**, bo są zbyt świeże: `Test 6` (4 dni ciszy),
  `TEST33` i `TEST67` (po 10 dni). To one przesądziły o wyborze ostrzeżenia zamiast zakazu.

## Decyzje (z sesji brainstormingu)

1. **Umiejscowienie strony QR**: panel admina, pozycja pod „Urządzenia" (`/admin/share`).
2. **Przyciski pod kodem**: „Skopiuj link" (zawsze) + „Wyślij" przez Web Share API
   (tylko gdy `navigator.share` istnieje).
3. **Zamiast twardego `DELETE` — archiwizacja** na istniejącej kolumnie `is_active`.
   Rekord zostaje w bazie, więc urządzenie nie może wrócić na listę jako nowe zgłoszenie.
4. **Kryterium to `last_seen_at`, nie `registered_at`.** Wiek rejestracji jest odwrotnie
   skorelowany z ryzykiem: najstarsze rekordy to tablet przy kasie i telefon szefa,
   zarejestrowane raz i pracujące codziennie. Potwierdzone danymi z żywej bazy.
5. **Próg 30 dni jest ostrzeżeniem, nie zakazem.** Archiwizować można każde urządzenie
   poza bieżącym; przy urządzeniu aktywnym w ostatnich 30 dniach modal ostrzega konkretną
   liczbą dni. Uzasadnienie: żaden próg nie oddzieli `TEST33` (10 dni ciszy) od `Ewela`
   (5 dni ciszy) — różnią się intencją, nie liczbą. Szef jest jedynym adminem i wie,
   które jest które; system ma chronić przed przypadkowym tapnięciem, nie przed decyzją.
6. **Nazwa przycisku: „Archiwizuj"** (nie „Usuń z listy").
7. **Sekcja „Archiwum (N)" zawsze widoczna**, domyślnie zwinięta, również przy `N = 0`.
8. **Archiwizacja ustawia `status: blocked` razem z `is_active: false`.** Patrz niżej.

### Dlaczego archiwizacja blokuje dostęp

`DeviceContext` trzyma UUID urządzenia w `localStorage` i przy każdym starcie odpytuje
`getByDeviceId`. To wymusza wybór jednego z trzech zachowań:

| Wariant                                    | Skutek                                                                                     | Werdykt     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------- |
| `getByDeviceId` filtruje `is_active`       | Urządzenie widzi `RegisterScreen` → rejestruje się od nowa jako `pending` → wraca na listę | odrzucony   |
| `getByDeviceId` ignoruje `is_active`       | Urządzenie działa dalej, znika tylko z widoku admina — szef traci kontrolę nad dostępem    | odrzucony   |
| **`status: blocked` + `is_active: false`** | Traci dostęp (`BlockedScreen`), nie wraca jako `pending`, znika z listy                    | **wybrany** |

Semantyka „Archiwizuj" = **„odbierz dostęp i schowaj z oczu"**, jedna operacja w jednym
`UPDATE`. „Przywróć" cofa wyłącznie `is_active` — urządzenie wraca na listę w sekcji
**Zablokowane**, a odblokowanie wymaga osobnego, świadomego kliknięcia. Nic nie wraca
do obiegu przypadkiem.

Dotyczy to również urządzeń o statusie `pending`: archiwizacja zgłoszenia ustawia
`blocked`, więc po przywróceniu trafia ono do sekcji **Zablokowane**, a nie z powrotem
do **Oczekujących**. To celowe — inaczej odrzucone zgłoszenie mogłoby wrócić do kolejki
zatwierdzania i zostać przepuszczone przez pomyłkę.

## Architektura

Wzorzec projektu: logika domenowa w `src/lib/` (czysta, testowalna bez bazy), UI cienki,
dostęp do danych przez adapter `src/db/`. Strony przez `React.lazy` w `src/App.tsx`.

| Plik                                              | Rola                                                                                       | Akcja  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ |
| `src/pages/AdminShare.tsx`                        | Strona QR: adres aplikacji, kod, „Skopiuj link", „Wyślij".                                 | nowy   |
| `src/lib/devices.ts`                              | Czysta reguła `checkArchiveGuard(...)` → `ArchiveGuard`. Zero zależności od DB.            | nowy   |
| `src/lib/__tests__/devices.test.ts`               | Testy reguły na przypadkach z żywej bazy.                                                  | nowy   |
| `src/App.tsx`                                     | `lazy` import `AdminShare` + `<Route path="/admin/share">` w `AdminGuard`.                 | edycja |
| `src/pages/Admin.tsx`                             | `AdminLink` „Udostępnij aplikację" pod „Urządzenia".                                       | edycja |
| `src/pages/AdminDevices.tsx`                      | Przycisk „Archiwizuj" + modale + sekcja „Archiwum (N)" z „Przywróć".                       | edycja |
| `src/lib/types.ts`                                | `DeviceRegistration` + pole `isActive: boolean`.                                           | edycja |
| `src/lib/constants.ts`                            | `DEVICE_ARCHIVE_INACTIVE_DAYS = 30`.                                                       | edycja |
| `src/db/types.ts`                                 | `DbAdapter.devices` + `archive(id)`, `restore(id)`.                                        | edycja |
| `src/db/adapters/supabase.ts`                     | `mapDevice` + `isActive`; implementacja `archive` / `restore`.                             | edycja |
| `src/db/adapters/rest.ts`                         | `archive` / `restore` (naprawa ukośników okazała się niepotrzebna — patrz „Sprostowanie"). | edycja |
| `src/db/adapters/__tests__/rest-contract.test.ts` | Sprawdzanie kształtu ścieżek URL.                                                          | edycja |
| `package.json`                                    | dodanie zależności `react-qr-code`.                                                        | edycja |

Bez zmian w bazie danych — `is_active` już istnieje i jest niewykorzystywana.

## Część 1 — strona „Udostępnij aplikację"

### Źródło adresu

```ts
const appUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href;
```

`window.location.origin` bierze się z przeglądarki, więc zmiana domeny nie wymaga zmiany
kodu. `import.meta.env.BASE_URL` pochodzi z `base` w `vite.config.ts:11` i obsługuje
przedrostek `/pos-app/` na GitHub Pages — samo `origin` dawałoby link prowadzący na 404.
Wzorzec już obecny w kodzie: `ServiceWorkerRegistration.tsx:32`, `Dashboard.tsx:97`.

### Kod QR

Biblioteka `react-qr-code` — renderuje czysty SVG, brak zależności, ~4 kB, działa
w jsdom (testy) i offline w PWA. Odrzucone: `qrcode` (rysuje na `<canvas>`, ~50 kB,
kłopotliwy w testach) oraz zewnętrzne API generujące QR (wymaga internetu przy każdym
otwarciu i wysyła adres salonu na obcy serwer).

**Kod musi siedzieć na wymuszonym białym tle (`Paper` + biały margines quiet zone),
niezależnie od motywu.** Aplikacja ma tryb ciemny; kod renderowany domyślnymi kolorami
motywu byłby jasny na ciemnym tle i czytniki go nie zeskanują.

### Układ

```
PageHeader „Udostępnij aplikację"   [← /admin]
──────────────────────────────────────────────
  Pracownik skanuje kod telefonem, wypełnia
  formularz, a Ty zatwierdzasz go w „Urządzenia".

           ┌────────────────┐
           │                │   biały Paper
           │   [ kod QR ]   │   ~260 px, level M
           │                │
           └────────────────┘

  https://user.github.io/pos-app/     monospace, zaznaczalny

  [ Skopiuj link ]     zawsze
  [ Wyślij ]           tylko gdy navigator.share
```

`Skopiuj link` → `navigator.clipboard.writeText(appUrl)` w `try/catch`, potwierdzenie
przez `notifications.show()`. Clipboard API wymaga secure context — spełnione na GitHub
Pages, na Caddy (Hetzner) i na `localhost`.

`Wyślij` → `navigator.share({ title: "FORMEN", url: appUrl })`, przycisk montowany
warunkowo. Otwiera systemowy arkusz udostępniania, więc szef wysyła link na grupę
w komunikatorze jednym tapnięciem.

## Część 2 — archiwizacja urządzeń

### Reguła (`src/lib/devices.ts`)

```ts
export type ArchiveGuard =
  | { allowed: false } // bieżące urządzenie — przycisku nie ma
  | { allowed: true; level: "safe" } // pending | brak last_seen_at | cisza > 30 dni
  | { allowed: true; level: "warn"; daysSilent: number }; // aktywne w ostatnich 30 dniach

export function checkArchiveGuard(
  device: DeviceRegistration,
  currentDeviceId: string,
  now: Date
): ArchiveGuard;
```

Kolejność decyzji:

1. `device.deviceId === currentDeviceId` → `{ allowed: false }` — szef nie odetnie sam siebie.
2. `device.status === "pending"` → `safe` — nigdy nie zatwierdzone, więc nic nie robiło.
3. `device.lastSeenAt === null` → `safe` — nigdy nie odpalone.
4. cisza dłuższa niż `DEVICE_ARCHIVE_INACTIVE_DAYS` → `safe`.
5. w pozostałych przypadkach → `warn` z policzoną liczbą dni ciszy.

Funkcja jest czysta i przyjmuje `now` jako argument, żeby testy nie zależały od zegara.

### Warstwa bazy

```ts
// src/db/types.ts — DbAdapter.devices
archive(id: string): Promise<void>;   // status: "blocked", is_active: false
restore(id: string): Promise<void>;   // is_active: true (status bez zmian)
```

`getAll()` bez zmian — zwraca komplet rekordów wraz z `isActive`, a podział na listę
widoczną i archiwum robi UI. Przy kilkudziesięciu rekordach to tańsze niż drugie zapytanie.

`getByDeviceId()` **bez zmian** — to jest cała ochrona przed powrotem urządzenia:
zarchiwizowany rekord ma status `blocked`, więc `DeviceGate` pokaże `BlockedScreen`,
a nie `RegisterScreen`.

`mapDevice` (`supabase.ts:122`) dostaje `isActive: row.is_active !== false` — fallback
na `true` przy braku pola chroni przed ukryciem całej listy, gdyby kolumny zabrakło
w innym środowisku.

### UI (`src/pages/AdminDevices.tsx`)

Przycisk `Archiwizuj` (`IconArchive`, `variant="subtle"`, szary) w `DeviceCard` obok
istniejących akcji, renderowany tylko gdy `checkArchiveGuard(...).allowed`.

Modal potwierdzenia, treść zależna od `level`:

- `safe` — „Urządzenie zniknie z listy i straci dostęp do aplikacji. Możesz je przywrócić
  w sekcji Archiwum."
- `warn` — dodatkowo, na czerwono: „Urządzenie było używane {daysSilent} dni temu.
  Jeśli ktoś z niego korzysta, zostanie wylogowany."

Sekcja `Archiwum (N)` w `Collapse` na dole listy, zawsze obecna, domyślnie zwinięta.
Karty w środku bez akcji poza `Przywróć`.

Bieżące urządzenie oznaczone w karcie tekstem „to urządzenie" — żeby brak przycisku
był zrozumiały, a nie wyglądał na błąd.

### Efekt na żywych danych

Lista 34 → 8 realnie używanych urządzeń. `Test 6`, `TEST33` i `TEST67` archiwizowalne
od razu przez modal ostrzegawczy, mimo że nie przekroczyły progu 30 dni.

## Sprostowanie (2026-08-10, w trakcie implementacji)

Wcześniejsza wersja tego spec-a twierdziła, że `src/db/adapters/rest.ts:63` i `:67`
mają odwrotne ukośniki w literałach szablonowych i że `approve` / `block` są przez to
rozsypane. **To było błędne.** Plik od zawsze miał poprawne `/api/devices/${id}/approve`;
odwrotne ukośniki były artefaktem renderowania wyniku wyszukiwania na Windows,
a nie treścią pliku. Żadna naprawa nie była potrzebna.

Test `rest-contract.test.ts` mimo to zostaje rozszerzony o sprawdzanie kształtu ścieżek
dla `approve` / `block` / `archive` / `restore`. Nie jest to test regresji, tylko
zabezpieczenie na przyszłość: odwrotny ukośnik w literale szablonowym tworzy sekwencję
ucieczki i cicho psuje URL, a TypeScript tego nie wykryje, bo typem nadal jest `string`.

## Testy

`src/lib/__tests__/devices.test.ts` — `checkArchiveGuard` na przypadkach z żywej bazy:

| Przypadek                        | Oczekiwanie              |
| -------------------------------- | ------------------------ |
| `iPhone 17` = bieżące urządzenie | `allowed: false`         |
| `Ewela`, cisza 5 dni             | `warn`, `daysSilent: 5`  |
| `TEST33`, cisza 10 dni           | `warn`, `daysSilent: 10` |
| dokładnie 30 dni ciszy (granica) | `warn`                   |
| dokładnie 31 dni ciszy (granica) | `safe`                   |
| `test16`, cisza 110 dni          | `safe`                   |
| status `pending`, cisza 1 dzień  | `safe`                   |
| `lastSeenAt === null`            | `safe`                   |

`src/db/adapters/__tests__/rest-contract.test.ts` — rozszerzenie o ścieżki
`approve` / `block` / `archive` / `restore`.

Smoke test `AdminShare` — sprawdza, że renderowany adres składa się z `origin`
i `BASE_URL` (nie samego `origin`).

## Ryzyka

1. **`rest.ts` niesprawdzalny dziś** — endpointy `/archive` i `/restore` nie istnieją
   po stronie serwera, bo serwera z ADR-015 jeszcze nie ma. Kod frontendu powstaje
   „w ciemno", weryfikacja dopiero przy migracji na Hetzner.
2. **Jedna nowa zależność produkcyjna** (`react-qr-code`).
3. **Kod QR w trybie ciemnym** — jeśli biały `Paper` zostanie pominięty, kod będzie
   wyglądał poprawnie na ekranie, a mimo to nie zeskanuje się. Objaw nieoczywisty,
   dlatego wymaga sprawdzenia realnym telefonem, nie tylko na zrzucie ekranu.

## Poza zakresem

- Twarde `DELETE` rekordów urządzeń.
- Masowe zaznaczanie i archiwizowanie wielu urządzeń naraz.
- Automatyczne czyszczenie po czasie (bez udziału szefa).
- Wypełnianie `transaction.device_id` przy zapisie transakcji — osobny temat,
  wart rozważenia, bo dałby mocniejsze kryterium „czy to urządzenie kiedykolwiek
  cokolwiek sprzedało".
- Ograniczenie rejestracji urządzeń typu `admin` — dziś każdy, kto zna PIN 1234,
  rejestruje się jako urządzenie szefa (14 z 34 rekordów w bazie to typ `admin`).
