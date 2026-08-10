# Udostępnianie aplikacji (QR) i archiwizacja urządzeń — plan implementacji

> **Dla agentów wykonawczych:** WYMAGANY SUB-SKILL: użyj `superpowers:subagent-driven-development` (zalecane) albo `superpowers:executing-plans`, żeby wykonać ten plan zadanie po zadaniu. Kroki mają składnię checkboxów (`- [ ]`) do śledzenia postępu.

**Spec:** `docs/superpowers/specs/2026-08-10-udostepnianie-aplikacji-i-archiwizacja-urzadzen-design.md` (commit `7669d44`)

**Cel:** Dodać w panelu szefa stronę z kodem QR do udostępniania aplikacji oraz możliwość archiwizowania urządzeń, żeby lista w `/admin/devices` zeszła z 34 pozycji do 8 realnie używanych.

**Architektura:** Logika domenowa jako czyste funkcje w `src/lib/` (testowalne bez bazy i bez DOM-u), UI cienki w `src/pages/`, dostęp do danych wyłącznie przez adapter `src/db/`. Archiwizacja korzysta z istniejącej, dotąd nieużywanej kolumny `device_registration.is_active` — żadna migracja bazy nie jest potrzebna.

**Stack:** Vite + React 19 + TypeScript (strict), Mantine UI 9, React Router v7, Vitest + Testing Library, Supabase JS.

## Global Constraints

- **Język kodu angielski, język interfejsu polski** (z pełnymi znakami diakrytycznymi).
- **Tylko komponenty Mantine 9.** Bez shadcn, bez surowego Tailwind, bez własnego CSS poza propsami Mantine.
- **TypeScript strict.** Każda eksportowana funkcja i komponent ma jawny typ zwracany (`React.JSX.Element` dla komponentów).
- **NIE podbijaj wersji** w `package.json`. Zostaje `0.1.125`.
- **NIE pushuj.** Wszystkie commity zostają lokalnie na `main`.
- **Nie modyfikuj `.mcp.json`** — ma niezacommitowane zmiany użytkownika w drzewie roboczym.
- Testy mockują moduł `@/db` przez `vi.mock`. Komponenty Mantine w testach wymagają opakowania w `<MantineProvider>`.
- Pre-commit (Husky + lint-staged) sam uruchamia Prettier i ESLint na plikach w stage — nie formatuj ręcznie.
- Pełna weryfikacja przed zakończeniem pracy: `npm run lint && npx tsc --noEmit && npm test` na całym repo.
- Stan wyjściowy: 83 testy w 10 plikach. Po tym planie ma być więcej i **wszystkie zielone**.

## Struktura plików

| Plik                                              | Odpowiedzialność                                                           | Zadanie |
| ------------------------------------------------- | -------------------------------------------------------------------------- | ------- |
| `src/lib/appUrl.ts`                               | Czysta funkcja `buildAppUrl` — składa adres aplikacji z origin i base path | 1       |
| `src/lib/__tests__/appUrl.test.ts`                | Testy `buildAppUrl`                                                        | 1       |
| `src/pages/AdminShare.tsx`                        | Strona QR: kod, adres, „Skopiuj link", „Wyślij"                            | 1       |
| `src/pages/__tests__/AdminShare.test.tsx`         | Smoke test strony QR                                                       | 1       |
| `src/App.tsx`                                     | `lazy` import + trasa `/admin/share` w `AdminGuard`                        | 1       |
| `src/pages/Admin.tsx`                             | `AdminLink` „Udostępnij aplikację"                                         | 1       |
| `src/lib/constants.ts`                            | Stała `DEVICE_ARCHIVE_INACTIVE_DAYS`                                       | 2       |
| `src/lib/devices.ts`                              | Czysta reguła `checkArchiveGuard`                                          | 2       |
| `src/lib/__tests__/devices.test.ts`               | Testy reguły                                                               | 2       |
| `src/lib/types.ts`                                | `DeviceRegistration.isActive`                                              | 3       |
| `src/db/types.ts`                                 | `DbAdapter.devices.archive` / `.restore`                                   | 3       |
| `src/db/adapters/supabase.ts`                     | `mapDevice` + `isActive`, implementacja `archive` / `restore`              | 3       |
| `src/db/adapters/rest.ts`                         | `archive` / `restore` (ukośniki były poprawne — patrz Sprostowanie)        | 3       |
| `src/db/adapters/__tests__/rest-contract.test.ts` | Test kształtu ścieżek URL                                                  | 3       |
| `src/pages/AdminDevices.tsx`                      | Przycisk „Archiwizuj", modale, sekcja „Archiwum (N)"                       | 4       |
| `package.json`                                    | Zależność `react-qr-code`                                                  | 1       |

Zadanie 1 jest niezależne od pozostałych i dowozi działającą funkcję samo w sobie. Zadania 2 → 3 → 4 budują archiwizację warstwami: reguła, dane, interfejs.

---

## Task 1: Strona „Udostępnij aplikację"

**Files:**

- Create: `src/lib/appUrl.ts`
- Create: `src/lib/__tests__/appUrl.test.ts`
- Create: `src/pages/AdminShare.tsx`
- Create: `src/pages/__tests__/AdminShare.test.tsx`
- Modify: `src/App.tsx` (dodanie `lazy` importu przy linii 25 i trasy przy linii 102)
- Modify: `src/pages/Admin.tsx` (nowy `AdminLink` po bloku „Urządzenia", linie 152-156)
- Modify: `package.json` (zależność)

**Interfaces:**

- Consumes: `PageHeader` z `@/components/layout/PageHeader` (propsy `title`, `backTo`), `useDocumentTitle` z `@/hooks/useDocumentTitle`.
- Produces: `buildAppUrl(origin: string, basePath: string): string` — nieużywana przez inne zadania, ale eksportowana i testowana osobno.

- [x] **Step 1: Zainstaluj zależność**

```bash
npm install react-qr-code
```

Sprawdź, że w `package.json` w `dependencies` pojawiło się `react-qr-code`, a **wersja aplikacji (`"version": "0.1.125"`) się nie zmieniła**.

- [x] **Step 2: Napisz failujący test `buildAppUrl`**

Utwórz `src/lib/__tests__/appUrl.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildAppUrl } from "../appUrl";

describe("buildAppUrl", () => {
  it("zachowuje base path na GitHub Pages", () => {
    expect(buildAppUrl("https://user.github.io", "/pos-app/")).toBe(
      "https://user.github.io/pos-app/"
    );
  });

  it("działa dla aplikacji w korzeniu domeny", () => {
    expect(buildAppUrl("https://formen.pl", "/")).toBe("https://formen.pl/");
  });

  it("dokleja końcowy ukośnik, gdy base path go nie ma", () => {
    expect(buildAppUrl("https://formen.pl", "/pos-app")).toBe("https://formen.pl/pos-app/");
  });

  it("nie gubi portu w origin (tryb deweloperski)", () => {
    expect(buildAppUrl("http://localhost:5173", "/")).toBe("http://localhost:5173/");
  });
});
```

- [x] **Step 3: Uruchom test i potwierdź, że pada**

Run: `npx vitest run src/lib/__tests__/appUrl.test.ts`
Expected: FAIL — `Failed to resolve import "../appUrl"`.

- [x] **Step 4: Zaimplementuj `buildAppUrl`**

Utwórz `src/lib/appUrl.ts`:

```ts
/**
 * Buduje pelny adres aplikacji z origin przegladarki i base path z Vite.
 *
 * Samo `window.location.origin` zgubiloby przedrostek "/pos-app" na GitHub Pages
 * i kod QR prowadzilby na 404. Base path pochodzi z `base` w vite.config.ts,
 * wiec po przeprowadzce na wlasna domene adres dostosuje sie sam.
 */
export function buildAppUrl(origin: string, basePath: string): string {
  const path = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return new URL(path, origin).href;
}
```

- [x] **Step 5: Uruchom test i potwierdź, że przechodzi**

Run: `npx vitest run src/lib/__tests__/appUrl.test.ts`
Expected: PASS — 4 testy.

- [x] **Step 6: Utwórz stronę `AdminShare.tsx`**

Utwórz `src/pages/AdminShare.tsx`:

```tsx
import QRCode from "react-qr-code";
import { Text, Stack, Box, Container, Divider, Paper, Button, Code } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconShare } from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { buildAppUrl } from "@/lib/appUrl";

export default function AdminSharePage(): React.JSX.Element {
  useDocumentTitle("Udostępnij aplikację");

  const appUrl = buildAppUrl(window.location.origin, import.meta.env.BASE_URL);
  const canShare = typeof navigator.share === "function";

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(appUrl);
      notifications.show({ color: "green", message: "Link skopiowany" });
    } catch {
      notifications.show({
        color: "red",
        message: "Nie udało się skopiować. Zaznacz adres i skopiuj ręcznie.",
      });
    }
  };

  const handleShare = async (): Promise<void> => {
    try {
      await navigator.share({ title: "FORMEN", url: appUrl });
    } catch {
      // Uzytkownik anulowal arkusz udostepniania - to nie jest blad.
    }
  };

  return (
    <Box mih="100vh">
      <Container size="xs">
        <PageHeader title="Udostępnij aplikację" backTo="/admin" />
        <Divider />

        <Stack align="center" gap="lg" py="xl">
          <Text fz="sm" c="dimmed" ta="center">
            Pracownik skanuje kod telefonem, wypełnia formularz rejestracji, a Ty zatwierdzasz go w
            „Urządzenia".
          </Text>

          {/* Tlo MUSI byc biale niezaleznie od motywu - kod QR w trybie ciemnym
              wygladalby poprawnie, ale czytniki go nie zeskanuja. */}
          <Paper bg="white" p="md" radius="md" withBorder>
            <QRCode value={appUrl} size={240} level="M" bgColor="#ffffff" fgColor="#000000" />
          </Paper>

          <Code fz="xs" style={{ wordBreak: "break-all" }}>
            {appUrl}
          </Code>

          <Stack gap="sm" w="100%">
            <Button fullWidth size="lg" leftSection={<IconCopy size={18} />} onClick={handleCopy}>
              Skopiuj link
            </Button>
            {canShare && (
              <Button
                fullWidth
                size="lg"
                variant="light"
                leftSection={<IconShare size={18} />}
                onClick={handleShare}
              >
                Wyślij
              </Button>
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
```

- [x] **Step 7: Napisz smoke test strony**

Utwórz `src/pages/__tests__/AdminShare.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

const mockNotificationsShow = vi.fn();
const mockWriteText = vi.fn().mockResolvedValue(undefined);

vi.mock("@mantine/notifications", () => ({
  notifications: { show: (...args: unknown[]) => mockNotificationsShow(...args) },
  Notifications: () => null,
}));

// PageHeader jest mockowany, wiec react-router nie trafia do grafu modulow tego testu.
vi.mock("@/components/layout/PageHeader", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

import AdminSharePage from "../AdminShare";

function renderPage() {
  return render(
    <MantineProvider>
      <AdminSharePage />
    </MantineProvider>
  );
}

describe("AdminSharePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      configurable: true,
    });
  });

  it("pokazuje adres zlozony z origin i base path, a nie samego origin", () => {
    renderPage();
    // jsdom: origin to http://localhost:3000, BASE_URL w vitest to "/"
    const expected = `${window.location.origin}/`;
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("renderuje kod QR jako SVG", () => {
    const { container } = renderPage();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("kopiuje adres do schowka i potwierdza powiadomieniem", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Skopiuj link/i }));

    expect(mockWriteText).toHaveBeenCalledWith(`${window.location.origin}/`);
    expect(mockNotificationsShow).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Link skopiowany" })
    );
  });
});
```

- [x] **Step 8: Uruchom testy strony**

Run: `npx vitest run src/pages/__tests__/AdminShare.test.tsx`
Expected: PASS — 3 testy.

Jeśli test „renderuje kod QR jako SVG" pada, sprawdź, czy `react-qr-code` faktycznie się zainstalował (Step 1) — biblioteka renderuje `<svg>` bez `<canvas>`, więc w jsdom działa bez dodatkowej konfiguracji.

- [x] **Step 9: Podłącz trasę w `src/App.tsx`**

Po linii 25 (`const AdminReports = lazy(...)`) dodaj:

```tsx
const AdminShare = lazy(() => import("@/pages/AdminShare"));
```

Po bloku trasy `/admin/devices` (linie 94-101), przed trasą `/admin/survey`, dodaj:

```tsx
<Route
  path="/admin/share"
  element={
    <AdminGuard>
      <AdminShare />
    </AdminGuard>
  }
/>
```

- [x] **Step 10: Dodaj link w panelu admina**

W `src/pages/Admin.tsx`, po `<AdminLink label="Urządzenia" ... />` i następującym po nim `<Divider />` (linie 152-157), wstaw:

```tsx
<AdminLink
  label="Udostępnij aplikację"
  description="Kod QR do rejestracji nowego urządzenia"
  onClick={() => navigate("/admin/share")}
/>
<Divider />
```

- [x] **Step 11: Weryfikacja całości**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: lint bez błędów, tsc bez błędów, wszystkie testy zielone (83 + 7 nowych = 90).

- [x] **Step 12: Commit**

```bash
git add package.json package-lock.json src/lib/appUrl.ts src/lib/__tests__/appUrl.test.ts src/pages/AdminShare.tsx src/pages/__tests__/AdminShare.test.tsx src/App.tsx src/pages/Admin.tsx
git commit -m "feat(admin): strona Udostepnij aplikacje z kodem QR"
```

---

## Task 2: Reguła archiwizacji (czysta logika)

**Files:**

- Create: `src/lib/devices.ts`
- Create: `src/lib/__tests__/devices.test.ts`
- Modify: `src/lib/constants.ts` (dopisanie stałej na końcu sekcji stałych, po linii 9)

**Interfaces:**

- Consumes: typ `DeviceRegistration` z `@/lib/types` (istnieje, pola: `id`, `deviceId`, `status`, `lastSeenAt`, …).
- Produces:
  - `DEVICE_ARCHIVE_INACTIVE_DAYS: number` (= 30) z `@/lib/constants`
  - `type ArchiveGuard` — unia trzech wariantów (patrz niżej)
  - `checkArchiveGuard(device: DeviceRegistration, currentDeviceId: string, now: Date): ArchiveGuard`

  Zadanie 4 używa obu tych eksportów.

- [x] **Step 1: Dodaj stałą**

W `src/lib/constants.ts`, po linii 9 (`export const MAX_TIP = 1000;`), dopisz:

```ts
// Po ilu dniach ciszy urzadzenie mozna zarchiwizowac bez ostrzezenia.
// Ponizej tego progu archiwizacja nadal jest mozliwa, ale wymaga potwierdzenia
// w modalu ostrzegawczym - patrz checkArchiveGuard w src/lib/devices.ts
export const DEVICE_ARCHIVE_INACTIVE_DAYS = 30;
```

- [x] **Step 2: Napisz failujące testy reguły**

Utwórz `src/lib/__tests__/devices.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { checkArchiveGuard } from "../devices";
import type { DeviceRegistration } from "../types";

const NOW = new Date("2026-08-10T12:00:00Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function device(over: Partial<DeviceRegistration> = {}): DeviceRegistration {
  return {
    id: "row-1",
    deviceId: "uuid-1",
    employeeId: null,
    deviceType: "personal",
    status: "approved",
    deviceName: "Telefon",
    registeredAt: daysAgo(200),
    approvedAt: daysAgo(200),
    lastSeenAt: daysAgo(200),
    isActive: true,
    ...over,
  };
}

describe("checkArchiveGuard", () => {
  it("nie pozwala zarchiwizowac biezacego urzadzenia", () => {
    const d = device({ deviceId: "uuid-mine", lastSeenAt: daysAgo(300) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({ allowed: false });
  });

  it("ostrzega przy urzadzeniu uzywanym 5 dni temu (Ewela)", () => {
    const d = device({ deviceName: "Ewela", lastSeenAt: daysAgo(5) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({
      allowed: true,
      level: "warn",
      daysSilent: 5,
    });
  });

  it("ostrzega przy urzadzeniu uzywanym 10 dni temu (TEST33)", () => {
    const d = device({ deviceName: "TEST33", deviceType: "admin", lastSeenAt: daysAgo(10) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({
      allowed: true,
      level: "warn",
      daysSilent: 10,
    });
  });

  it("granica: dokladnie 30 dni ciszy nadal ostrzega", () => {
    const d = device({ lastSeenAt: daysAgo(30) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({
      allowed: true,
      level: "warn",
      daysSilent: 30,
    });
  });

  it("granica: 31 dni ciszy jest bezpieczne", () => {
    const d = device({ lastSeenAt: daysAgo(31) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({ allowed: true, level: "safe" });
  });

  it("stare urzadzenie testowe (110 dni ciszy) jest bezpieczne", () => {
    const d = device({ deviceName: "test16", lastSeenAt: daysAgo(110) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({ allowed: true, level: "safe" });
  });

  it("zgloszenie oczekujace jest bezpieczne nawet gdy swieze", () => {
    const d = device({ status: "pending", lastSeenAt: daysAgo(1) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({ allowed: true, level: "safe" });
  });

  it("urzadzenie nigdy nie widziane jest bezpieczne", () => {
    const d = device({ lastSeenAt: null });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({ allowed: true, level: "safe" });
  });

  it("nie pokazuje ujemnej liczby dni przy rozjechanym zegarze", () => {
    const d = device({ lastSeenAt: new Date(NOW.getTime() + 60_000).toISOString() });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({
      allowed: true,
      level: "warn",
      daysSilent: 0,
    });
  });
});
```

- [x] **Step 3: Uruchom testy i potwierdź, że padają**

Run: `npx vitest run src/lib/__tests__/devices.test.ts`
Expected: FAIL — `Failed to resolve import "../devices"`.

Jeśli zamiast tego widzisz błąd TypeScript o nadmiarowym polu `isActive` w `DeviceRegistration` — to oczekiwane, pole dochodzi w Zadaniu 3. Testy Vitest i tak się uruchomią (esbuild nie sprawdza typów), a `tsc --noEmit` przejdzie dopiero po Zadaniu 3. Nie usuwaj `isActive` z helpera `device()`.

- [x] **Step 4: Zaimplementuj regułę**

Utwórz `src/lib/devices.ts`:

```ts
import type { DeviceRegistration } from "./types";
import { DEVICE_ARCHIVE_INACTIVE_DAYS } from "./constants";

/**
 * Czy urzadzenie mozna zarchiwizowac i czy trzeba przy tym ostrzec szefa.
 *
 * Prog dni jest OSTRZEZENIEM, nie zakazem: zaden prog nie oddzieli urzadzenia
 * testowego od telefonu pracownika na urlopie - roznia sie intencja, nie liczba.
 * Twardo zabronione jest tylko archiwizowanie urzadzenia, na ktorym szef aktualnie
 * pracuje, bo odcialoby go od aplikacji.
 */
export type ArchiveGuard =
  | { allowed: false }
  | { allowed: true; level: "safe" }
  | { allowed: true; level: "warn"; daysSilent: number };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function checkArchiveGuard(
  device: DeviceRegistration,
  currentDeviceId: string,
  now: Date
): ArchiveGuard {
  if (device.deviceId === currentDeviceId) return { allowed: false };
  if (device.status === "pending") return { allowed: true, level: "safe" };
  if (!device.lastSeenAt) return { allowed: true, level: "safe" };

  const elapsed = now.getTime() - new Date(device.lastSeenAt).getTime();
  const daysSilent = Math.max(0, Math.floor(elapsed / MS_PER_DAY));

  if (daysSilent > DEVICE_ARCHIVE_INACTIVE_DAYS) return { allowed: true, level: "safe" };
  return { allowed: true, level: "warn", daysSilent };
}
```

- [x] **Step 5: Uruchom testy i potwierdź, że przechodzą**

Run: `npx vitest run src/lib/__tests__/devices.test.ts`
Expected: PASS — 9 testów.

- [x] **Step 6: Commit**

```bash
git add src/lib/devices.ts src/lib/__tests__/devices.test.ts src/lib/constants.ts
git commit -m "feat(devices): regula checkArchiveGuard (prog 30 dni jako ostrzezenie)"
```

---

## Task 3: Warstwa bazy — `archive` / `restore`

**Files:**

- Modify: `src/lib/types.ts:135-146` (`DeviceRegistration`)
- Modify: `src/db/types.ts:125-132` (`DbAdapter.devices`)
- Modify: `src/db/adapters/supabase.ts:122-136` (`mapDevice`) i `:222-235` (metody)
- Modify: `src/db/adapters/rest.ts:62-69` (nowe metody)
- Modify: `src/db/adapters/__tests__/rest-contract.test.ts` (nowy test)

**Interfaces:**

- Consumes: nic z poprzednich zadań.
- Produces:
  - `DeviceRegistration.isActive: boolean` — używane przez Zadanie 4 do podziału listy
  - `db.devices.archive(id: string): Promise<void>` — ustawia `status: "blocked"` **i** `is_active: false`
  - `db.devices.restore(id: string): Promise<void>` — ustawia wyłącznie `is_active: true`

- [x] **Step 1: Napisz failujący test kontraktu ścieżek URL**

W `src/db/adapters/__tests__/rest-contract.test.ts`, przed testem `"rzuca bledem na non-2xx response..."` (linia 80), wstaw:

```ts
it("devices.approve/block/archive/restore uzywaja poprawnych sciezek URL", async () => {
  const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

  const client = createRestClient(testConfig);
  await client.devices.approve("d1");
  await client.devices.block("d1");
  await client.devices.archive("d1");
  await client.devices.restore("d1");

  const urls = fetchMock.mock.calls.map((c) => c[0] as string);
  expect(urls).toEqual([
    "http://test.local/api/devices/d1/approve",
    "http://test.local/api/devices/d1/block",
    "http://test.local/api/devices/d1/archive",
    "http://test.local/api/devices/d1/restore",
  ]);
  // Odwrotny ukosnik w literale szablonowym tworzy sekwencje ucieczki ("\a")
  // i cicho rozsypuje URL - TypeScript tego nie zlapie, bo typem nadal jest string.
  for (const url of urls) expect(url).not.toContain("\\");
});
```

- [x] **Step 2: Uruchom test i potwierdź, że pada**

Run: `npx vitest run src/db/adapters/__tests__/rest-contract.test.ts`
Expected: FAIL — `client.devices.archive is not a function`.

To potwierdza, że test naprawdę sprawdza nową funkcjonalność.

> **Sprostowanie (2026-08-10):** wcześniejsza wersja tego planu twierdziła, że `approve` i `block` mają odwrotne ukośniki i są rozsypane. To było błędne — plik od zawsze miał poprawne `/api/devices/${id}/approve`, a odwrotne ukośniki były artefaktem renderowania wyniku wyszukiwania na Windows. Żadna naprawa nie jest potrzebna; test zostaje jako zabezpieczenie na przyszłość.

- [x] **Step 3: Dodaj `isActive` do typu domenowego**

W `src/lib/types.ts`, w interfejsie `DeviceRegistration` (linie 135-146), po `lastSeenAt: string | null;` dopisz:

```ts
isActive: boolean;
```

- [x] **Step 4: Rozszerz interfejs adaptera**

W `src/db/types.ts`, w bloku `devices` (linie 125-132), po `block(id: string): Promise<void>;` dopisz:

```ts
    archive(id: string): Promise<void>;
    restore(id: string): Promise<void>;
```

- [x] **Step 5: Zaimplementuj w adapterze Supabase**

W `src/db/adapters/supabase.ts`, w funkcji `mapDevice` (linie 124-135), po `lastSeenAt: (row.last_seen_at as string) || null,` dopisz:

```ts
      // Fallback na true: gdyby kolumny zabraklo w innym srodowisku,
      // lepiej pokazac urzadzenie niz ukryc cala liste.
      isActive: row.is_active !== false,
```

Następnie po metodzie `block` (kończy się w linii 235) dopisz:

```ts
      async archive(id: string) {
        // Archiwizacja odbiera dostep I chowa z listy. Sam is_active nie wystarczy:
        // getByDeviceId nie filtruje po is_active, wiec bez zmiany statusu
        // urzadzenie dzialaloby dalej, tylko niewidoczne dla szefa.
        const { error } = await supabase
          .from("device_registration")
          .update({ status: "blocked", is_active: false })
          .eq("id", id);
        if (error) throw error;
      },
      async restore(id: string) {
        // Status zostaje "blocked" - urzadzenie wraca do sekcji Zablokowane,
        // a wpuszczenie go z powrotem wymaga osobnego klikniecia "Odblokuj".
        const { error } = await supabase
          .from("device_registration")
          .update({ is_active: true })
          .eq("id", id);
        if (error) throw error;
      },
```

- [x] **Step 6: Napraw i uzupełnij adapter REST**

W `src/db/adapters/rest.ts` dopisz dwie nowe metody obok istniejących `approve` i `block` (te ostatnie zostaw bez zmian — są poprawne):

```ts
      async approve(id) {
        const r = await fetch(`${apiUrl}/api/devices/${id}/approve`, { method: "POST" });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
      },
      async block(id) {
        const r = await fetch(`${apiUrl}/api/devices/${id}/block`, { method: "POST" });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
      },
      async archive(id) {
        const r = await fetch(`${apiUrl}/api/devices/${id}/archive`, { method: "POST" });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
      },
      async restore(id) {
        const r = await fetch(`${apiUrl}/api/devices/${id}/restore`, { method: "POST" });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
      },
```

Uwaga: te endpointy nie istnieją jeszcze po stronie serwera (ADR-015, migracja na Hetzner niewdrożona). Kod powstaje na zapas i jest weryfikowany wyłącznie testem kontraktu.

- [x] **Step 7: Uruchom testy kontraktu i potwierdź, że przechodzą**

Run: `npx vitest run src/db/adapters/__tests__/rest-contract.test.ts`
Expected: PASS — 4 testy (3 istniejące + 1 nowy).

- [x] **Step 8: Sprawdź typy w całym repo**

Run: `npx tsc --noEmit`
Expected: brak błędów.

Jeśli `tsc` zgłasza brakujące `isActive` w obiektach `DeviceRegistration` w testach POS lub innych plikach, dopisz `isActive: true` do tych literałów — to zamierzony skutek rozszerzenia typu.

- [x] **Step 9: Commit**

```bash
git add src/lib/types.ts src/db/types.ts src/db/adapters/supabase.ts src/db/adapters/rest.ts src/db/adapters/__tests__/rest-contract.test.ts
git commit -m "feat(db): archive/restore urzadzen + test ksztaltu sciezek URL"
```

---

## Task 4: Interfejs archiwizacji w `/admin/devices`

**Files:**

- Modify: `src/pages/AdminDevices.tsx` (cały plik — przepisanie `DeviceCard` i komponentu strony)

**Interfaces:**

- Consumes:
  - `checkArchiveGuard`, `ArchiveGuard` z `@/lib/devices` (Zadanie 2)
  - `db.devices.archive(id)`, `db.devices.restore(id)`, `DeviceRegistration.isActive` (Zadanie 3)
  - `useDevice()` z `@/contexts/DeviceContext` — zwraca m.in. `deviceId: string` (UUID bieżącego urządzenia)
  - `pluralize(count, one, few, many)` z `@/lib/constants`
- Produces: nic dla dalszych zadań (ostatnie zadanie planu).

- [ ] **Step 1: Rozszerz importy**

W `src/pages/AdminDevices.tsx` zamień **cały blok importów (linie 1-27)** na poniższy. Nowe względem oryginału: `Modal`, `Collapse`, `UnstyledButton`, cztery ikony, `useDevice`, `checkArchiveGuard`, `pluralize`.

```tsx
import { useState } from "react";
import { db } from "@/db";
import { useDbQuery } from "@/hooks/useDbQuery";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { notifications } from "@mantine/notifications";
import {
  Text,
  Group,
  Stack,
  Box,
  Container,
  Divider,
  Badge,
  Button,
  Loader,
  Card,
  Modal,
  Collapse,
  UnstyledButton,
} from "@mantine/core";
import {
  IconDeviceMobile,
  IconCheck,
  IconBan,
  IconDeviceTablet,
  IconShield,
  IconUser,
  IconArchive,
  IconArrowBackUp,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDevice } from "@/contexts/DeviceContext";
import { checkArchiveGuard } from "@/lib/devices";
import { pluralize } from "@/lib/constants";
import type { DeviceRegistration } from "@/lib/types";
```

- [ ] **Step 2: Dodaj obsługę archiwizacji w `DeviceCard`**

Zamień sygnaturę i początek `DeviceCard` (linie 62-72) na:

```tsx
function DeviceCard({
  device,
  currentDeviceId,
  onAction,
}: {
  device: DeviceRegistration;
  currentDeviceId: string;
  onAction: () => void;
}): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [archiveModal, setArchiveModal] = useState(false);
  const badge = STATUS_BADGE[device.status];
  const TypeIcon = TYPE_ICON[device.deviceType];
  const guard = checkArchiveGuard(device, currentDeviceId, new Date());
  const isCurrent = device.deviceId === currentDeviceId;
```

- [ ] **Step 3: Dodaj handler archiwizacji**

W `DeviceCard`, po `handleBlock` (kończy się w linii 101), dopisz:

```tsx
const handleArchive = async (): Promise<void> => {
  setLoading(true);
  try {
    await db.devices.archive(device.id);
    setArchiveModal(false);
    onAction();
  } catch {
    notifications.show({
      color: "red",
      message: "Nie udało się zarchiwizować urządzenia. Spróbuj ponownie.",
    });
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 4: Oznacz bieżące urządzenie w nagłówku karty**

W `DeviceCard`, w `<Group justify="space-between" mb="xs">` (linie 105-115), zamień blok badge'a na:

```tsx
<Group gap="xs">
  {isCurrent && (
    <Badge color="blue" variant="light" size="sm">
      To urządzenie
    </Badge>
  )}
  <Badge color={badge.color} variant="light" size="sm">
    {badge.label}
  </Badge>
</Group>
```

Dzięki temu brak przycisku „Archiwizuj" na własnej karcie wygląda na zamierzony, a nie na błąd.

- [ ] **Step 5: Dodaj przycisk i modal**

W `DeviceCard`, bezpośrednio przed zamykającym `</Card>` (linia 195), wstaw:

```tsx
{
  guard.allowed && (
    <Group mt="xs">
      <Button
        size="sm"
        variant="subtle"
        color="gray"
        leftSection={<IconArchive size={16} />}
        onClick={() => setArchiveModal(true)}
        loading={loading}
      >
        Archiwizuj
      </Button>
    </Group>
  );
}

<Modal
  opened={archiveModal}
  onClose={() => setArchiveModal(false)}
  title={
    <Text fw={700} fz="lg">
      Zarchiwizować urządzenie?
    </Text>
  }
  size="sm"
>
  <Stack gap="md">
    <Text fz="sm">
      <Text span fw={600}>
        {device.deviceName}
      </Text>{" "}
      zniknie z listy i straci dostęp do aplikacji. Możesz je przywrócić w sekcji Archiwum.
    </Text>
    {guard.allowed && guard.level === "warn" && (
      <Text fz="sm" c="red" fw={500}>
        Urządzenie było używane {pluralize(guard.daysSilent, "dzień", "dni", "dni")} temu. Jeśli
        ktoś z niego korzysta, zostanie wylogowany.
      </Text>
    )}
    <Group justify="flex-end">
      <Button variant="subtle" size="lg" onClick={() => setArchiveModal(false)}>
        Anuluj
      </Button>
      <Button color="red" size="lg" onClick={handleArchive} loading={loading}>
        Archiwizuj
      </Button>
    </Group>
  </Stack>
</Modal>;
```

- [ ] **Step 6: Dodaj komponent karty archiwalnej**

Po całym `DeviceCard` (przed `export default function AdminDevicesPage`, linia 199), dopisz:

```tsx
function ArchivedCard({
  device,
  onAction,
}: {
  device: DeviceRegistration;
  onAction: () => void;
}): React.JSX.Element {
  const [loading, setLoading] = useState(false);

  const handleRestore = async (): Promise<void> => {
    setLoading(true);
    try {
      await db.devices.restore(device.id);
      onAction();
    } catch {
      notifications.show({
        color: "red",
        message: "Nie udało się przywrócić urządzenia. Spróbuj ponownie.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card withBorder p="sm">
      <Group justify="space-between" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fz="sm" fw={500} truncate>
            {device.deviceName}
          </Text>
          <Text fz="xs" c="dimmed">
            {TYPE_LABEL[device.deviceType]} · ostatnio {formatDate(device.lastSeenAt)}
          </Text>
        </Box>
        <Button
          size="sm"
          variant="subtle"
          color="gray"
          leftSection={<IconArrowBackUp size={16} />}
          onClick={handleRestore}
          loading={loading}
        >
          Przywróć
        </Button>
      </Group>
    </Card>
  );
}
```

- [ ] **Step 7: Przepisz komponent strony**

Zamień całe `export default function AdminDevicesPage` (linie 199-263) na:

```tsx
export default function AdminDevicesPage(): React.JSX.Element {
  useDocumentTitle("Urządzenia");
  const { data: devices, loading, refetch } = useDevices();
  const { deviceId: currentDeviceId } = useDevice();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const visible = devices?.filter((d) => d.isActive) ?? [];
  const archived = devices?.filter((d) => !d.isActive) ?? [];

  const pending = visible.filter((d) => d.status === "pending");
  const approved = visible.filter((d) => d.status === "approved");
  const blocked = visible.filter((d) => d.status === "blocked");

  return (
    <Box mih="100vh">
      <Container size="sm">
        <PageHeader title="Urządzenia" backTo="/admin" />
        <Divider />

        {loading ? (
          <Stack align="center" py={40}>
            <Loader size="md" />
          </Stack>
        ) : !devices || devices.length === 0 ? (
          <Stack align="center" gap="md" py={40}>
            <IconDeviceMobile size={40} color="var(--mantine-color-dimmed)" />
            <Text fz="sm" c="dimmed" ta="center">
              Brak zarejestrowanych urządzeń
            </Text>
          </Stack>
        ) : (
          <Stack gap="lg" py="md">
            {pending.length > 0 && (
              <Stack gap="xs">
                <Text fw={600} fz="sm" c="yellow">
                  Oczekujące ({pending.length})
                </Text>
                {pending.map((d) => (
                  <DeviceCard
                    key={d.id}
                    device={d}
                    currentDeviceId={currentDeviceId}
                    onAction={refetch}
                  />
                ))}
              </Stack>
            )}

            {approved.length > 0 && (
              <Stack gap="xs">
                <Text fw={600} fz="sm" c="green">
                  Zatwierdzone ({approved.length})
                </Text>
                {approved.map((d) => (
                  <DeviceCard
                    key={d.id}
                    device={d}
                    currentDeviceId={currentDeviceId}
                    onAction={refetch}
                  />
                ))}
              </Stack>
            )}

            {blocked.length > 0 && (
              <Stack gap="xs">
                <Text fw={600} fz="sm" c="red">
                  Zablokowane ({blocked.length})
                </Text>
                {blocked.map((d) => (
                  <DeviceCard
                    key={d.id}
                    device={d}
                    currentDeviceId={currentDeviceId}
                    onAction={refetch}
                  />
                ))}
              </Stack>
            )}

            <Divider />

            <Stack gap="xs">
              <UnstyledButton onClick={() => setArchiveOpen((o) => !o)} py="xs">
                <Group gap="xs">
                  {archiveOpen ? (
                    <IconChevronDown size={16} color="var(--mantine-color-dimmed)" />
                  ) : (
                    <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
                  )}
                  <Text fw={600} fz="sm" c="dimmed">
                    Archiwum ({archived.length})
                  </Text>
                </Group>
              </UnstyledButton>
              <Collapse in={archiveOpen}>
                <Stack gap="xs">
                  {archived.length === 0 ? (
                    <Text fz="xs" c="dimmed" py="sm">
                      Archiwum jest puste.
                    </Text>
                  ) : (
                    archived.map((d) => <ArchivedCard key={d.id} device={d} onAction={refetch} />)
                  )}
                </Stack>
              </Collapse>
            </Stack>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
```

- [ ] **Step 8: Weryfikacja typów i lintu**

Run: `npx tsc --noEmit && npm run lint`
Expected: brak błędów.

Częsta pułapka: TypeScript zawęża unię `ArchiveGuard` dopiero po sprawdzeniu `guard.allowed`. Dlatego w modalu warunek brzmi `guard.allowed && guard.level === "warn"`, a nie samo `guard.level === "warn"` — bez tego `tsc` zgłosi, że `level` nie istnieje na wariancie `{ allowed: false }`.

- [ ] **Step 9: Sprawdzenie w działającej aplikacji**

Run: `npm run dev`

Sprawdź na `/admin/devices`:

1. Karta Twojego urządzenia ma badge „To urządzenie" i **nie ma** przycisku „Archiwizuj".
2. Karta starego urządzenia testowego (np. `test16`) ma „Archiwizuj", a modal **nie** pokazuje czerwonego ostrzeżenia.
3. Karta urządzenia z ciszą poniżej 30 dni (np. `TEST33`) ma „Archiwizuj", a modal **pokazuje** czerwone ostrzeżenie z liczbą dni.
4. Po archiwizacji urządzenie znika z listy i pojawia się w „Archiwum (N)".
5. „Przywróć" cofa je do sekcji **Zablokowane** (nie do „Oczekujące", nie do „Zatwierdzone").
6. Sekcja „Archiwum (0)" jest widoczna także wtedy, gdy nic nie zarchiwizowano.

Sprawdź też `/admin/share` na telefonie: zeskanuj kod QR realnym aparatem (nie tylko obejrzyj na ekranie) — w trybie ciemnym błąd tła objawia się wyłącznie tym, że czytnik nie reaguje.

- [ ] **Step 10: Pełna weryfikacja repo**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: wszystko zielone.

- [ ] **Step 11: Commit**

```bash
git add src/pages/AdminDevices.tsx
git commit -m "feat(devices): archiwizacja urzadzen z ostrzezeniem + sekcja Archiwum"
```

---

## Po wykonaniu planu

- [ ] Dopisz wpis do `changelog.txt` zgodnie z konwencją pliku (bez podbijania wersji w `package.json` — wersja zostaje `0.1.125`, chyba że użytkownik poprosi inaczej).
- [ ] Zgłoś użytkownikowi wynik `npm test` (liczba testów) i poinformuj, że commity czekają lokalnie na `main`, niewypchnięte.

## Świadomie poza zakresem tego planu

Twarde `DELETE`, masowe zaznaczanie urządzeń, automatyczne czyszczenie po czasie, wypełnianie `transaction.device_id` przy zapisie transakcji, ograniczenie rejestracji urządzeń typu `admin`. Uzasadnienia w sekcji „Poza zakresem" spec-a.
