# IDEAS - FORMEN POS

Backlog pomyslow i decyzji do realizacji w przyszlosci.
Rzeczy ktore NIE sa czescia Fazy 2/3 z TODO.md - cos do zrobienia "kiedys".

---

## Deploy PROD: Hetzner CX23 VPS (~2 dni pracy)

**Kontekst:** Obecnie `main` buduje sie na GitHub Pages (oczywisty przejsciowy setup). Docelowo: PostgreSQL self-hosted na VPS + PostgREST jako warstwa HTTP. Limity RAM: 4 GB total, ~1 GB wolne -> wyklucza self-hosted Supabase (~1.5 GB).

### Wybrana architektura

```
Przegladarka -> HTTPS (Nginx) -> PostgREST (localhost) -> PostgreSQL (localhost)
```

| Komponent     | Port             | Publicznie            | RAM                           |
| ------------- | ---------------- | --------------------- | ----------------------------- |
| Nginx         | 443, 80          | TAK                   | ~20 MB                        |
| PostgREST     | 3000 (DEV: 3001) | NIE (tylko 127.0.0.1) | ~20 MB                        |
| PostgreSQL 16 | 5432             | NIE (tylko 127.0.0.1) | ~150-200 MB (po tune: ~80 MB) |

Firewall: tylko 22/80/443 publicznie (Ufw/iptables, juz skonfigurowane).

### Konta na VPS

| Konto                 | Rola                                                                    | sudo | Klucz SSH      |
| --------------------- | ----------------------------------------------------------------------- | ---- | -------------- |
| `deploy` (istniejace) | Admin osobiste                                                          | TAK  | Osobisty GS    |
| `formen`              | CI/CD tylko dla pos-app (nologin shell, rsync do `/var/www/formen-pos`) | NIE  | GitHub Actions |

Kazda kolejna apka na VPS -> nowe konto per apka (izolacja): `barbercal`, `barbertime`, ...

### Etapy

**Etap 1: Setup bazy (0.5 dnia)**

1. PostgreSQL 16 apt install (jesli nie ma)
2. Dwie bazy + userzy:
   ```sql
   CREATE USER formen_prod_user WITH PASSWORD '...';
   CREATE DATABASE formen_prod OWNER formen_prod_user;
   CREATE USER formen_dev_user WITH PASSWORD '...';
   CREATE DATABASE formen_dev OWNER formen_dev_user;
   ```
3. Inicjalizacja:
   - PROD: `psql -f src/db/schema.sql` (BEZ seed.sql)
   - DEV: `psql -f schema.sql && psql -f seed.sql`
4. Tune PG dla 1 GB RAM: `shared_buffers=64MB`, `effective_cache_size=256MB`, `work_mem=4MB`

**Etap 2: Role DB i JWT auth (0.5 dnia)**

Migracja SQL (nowy plik np. `src/db/auth.sql`):

```sql
CREATE ROLE web_anon NOLOGIN;
GRANT USAGE ON SCHEMA public TO web_anon;
-- celowo bez uprawnien - anonimowy = nic nie moze

CREATE ROLE web_device NOLOGIN;
GRANT USAGE ON SCHEMA public TO web_device;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO web_device;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO web_device;
-- bez DELETE - soft delete zgodnie z ADR-007

CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '...';
GRANT web_anon TO authenticator;
GRANT web_device TO authenticator;

-- Weryfikacja PIN serwer-side (hash nigdy nie opuszcza serwera)
CREATE FUNCTION verify_admin_pin(pin_input text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT admin_pin_hash = crypt(pin_input, admin_pin_hash) FROM salon LIMIT 1;
$$;

-- Weryfikacja urzadzenia -> generowanie JWT (w PostgREST przez RPC)
CREATE FUNCTION verify_device(device_uuid text) RETURNS jsonb AS $$ ... $$;
```

**Etap 3: PostgREST (0.5 dnia)**

Pobranie binarza, plik `/etc/postgrest/formen-prod.conf`:

```
db-uri = "postgres://authenticator:...@localhost/formen_prod"
db-schemas = "public"
db-anon-role = "web_anon"
jwt-secret = "..."          # losowy 32-znakowy
server-host = "127.0.0.1"
server-port = 3000
server-cors-allowed-origins = "https://formen.domena.pl"
```

Analogicznie `formen-dev.conf` na port 3001.

systemd service: `postgrest@formen-prod.service` i `postgrest@formen-dev.service` (template).

**Etap 4: Nginx + HTTPS (0.25 dnia)**

```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d api.formen.pl -d dev-api.formen.pl
```

Reverse proxy 443 -> 127.0.0.1:3000 (prod) i osobny server block 127.0.0.1:3001 (dev).

**Etap 5: Migracja frontendu (0.5 dnia)**

Rewrite `src/db/adapters/rest.ts` uzywajac `@supabase/postgrest-js` zamiast surowego `fetch()`. Kod bedzie wygladac prawie identycznie jak `supabase.ts` - tylko inny import.

```bash
npm install @supabase/postgrest-js
```

Adapter wzorowany na `supabase.ts`:

```ts
import { PostgrestClient } from "@supabase/postgrest-js";

export function createRestClient(config: DbConfig): DbClient {
  const postgrest = new PostgrestClient(config.apiUrl!, {
    headers: { Authorization: `Bearer ${getJwt()}` },
  });
  return {
    salon: {
      async get() {
        const { data } = await postgrest.from("salon").select("*").single();
        return data;
      },
      // ... identyczne wzorce dla wszystkich zasobow
    },
    // ...
  };
}
```

**Etap 6: CI/CD (0.25 dnia)**

Zmiana `.github/workflows/deploy.yml`:

- `dev` -> GitHub Pages (jak obecnie) ALBO dev-api.formen.pl (nowa opcja)
- `main` -> rsync do `formen@vps:/var/www/formen-pos`

Nowy secret w GitHubie: `VPS_SSH_KEY`, `VPS_HOST`, `VITE_API_URL`.

### Zabezpieczenia dodatkowe

- **Rate-limit PIN brute-force**: Nginx `limit_req` 10 req/min + fail2ban na powtarzajace sie `POST /rpc/verify_admin_pin` z bledem
- **CORS whitelist**: tylko domeny formen.pl i dev.formen.pl
- **Backup PG**: `pg_dump` codziennie przez cron, trzymane w `/var/backups/pg/` + rsync na drugi serwer (raz w tygodniu)
- **Monitoring**: healthcheck endpoint `/api/health` + Uptimerobot (free plan)

### Decyzje do podjecia przed realizacja

1. Domeny: `api.formen.pl` + `dev-api.formen.pl` czy inne nazwy?
2. Czy na VPS DEV zostawic Supabase cloud jako backup, czy calkiem zlikwidowac?
3. Kiedy: po Fazie 2 czy po Fazie 3?

### Usuniecia przy okazji

Po migracji:

- Adapter `supabase` - do usuniecia (jesli zlikwidujemy Supabase cloud)
- Zaleznosc `@supabase/supabase-js` w package.json (zastepujemy `@supabase/postgrest-js`)
- Sekcje ADR-006 o Supabase - przepisac na "PostgreSQL + PostgREST"

---

## Stack idealny - gdybym pisal od nowa (hipotetyczna rewriting)

**Kontekst:** Retrospekt z 2026-04-15. Znajac juz charakter aplikacji (POS dla salonu, touch-first, offline PWA, self-hosted, dane finansowe), jak wygladalby optymalny stack gdybym zaczynal od zera. **To NIE jest plan migracji** - to referencja "jakbysmy kiedys pisali na nowo albo zakladali drugi projekt podobnego typu".

### Stack

| Warstwa            | Wybor                                     | Dlaczego                                                                      |
| ------------------ | ----------------------------------------- | ----------------------------------------------------------------------------- |
| Frontend framework | **Vite + React 19 + TS strict**           | PWA offline wymagany, SPA to standard dla "app-like" (Spotify, Figma, Linear) |
| UI library         | **shadcn/ui + Tailwind** LUB Mantine UI 9 | shadcn trendy + elastyczne. Mantine szybsze do dense POS UI                   |
| PWA                | vite-plugin-pwa + Workbox                 | Offline fallback dla salonu bez internetu                                     |
| State (lokalny)    | Zustand                                   | Prostszy niz Redux, jedno zrodlo prawdy dla globalnego state                  |
| State (serwerowy)  | **TanStack Query** (przez tRPC)           | Cache, refetch, optimistic updates, dedupe requestow                          |
| Forms              | react-hook-form + Zod resolver            | Szybsze niz Mantine useForm przy duzych formularzach, standard branzowy       |
| API kontrakt       | **tRPC**                                  | End-to-end type safety, zero kopiowania typow, auto-complete endpointow       |
| Backend            | **Hono** na Node.js (lub Bun)             | Najmniejszy, TS-first, pasuje do monorepo                                     |
| Walidacja          | **Zod** (wspoldzielona front + back)      | Jeden kontrakt dla calego systemu                                             |
| ORM                | **Drizzle**                               | Type-safe, lekki, migracje przez `drizzle-kit generate`                       |
| Baza               | PostgreSQL 16                             | ACID wymagane dla danych finansowych                                          |
| Monorepo           | **pnpm workspaces + TurboRepo**           | Typy wspoldzielone, gotowe na barberCal/barberTime                            |
| Testy jednostkowe  | Vitest + Testing Library                  | Bez zmian                                                                     |
| Testy DB           | **pg-mem** (in-memory PG)                 | Testy trafiaja realne zapytania SQL zamiast vi.mock                           |
| Testy e2e          | Playwright                                | Standard branzowy, lepsze od Cypress w 2026                                   |
| Mockowanie fetch   | **MSW (Mock Service Worker)**             | Przechwytuje network na poziomie SW, zastepuje vi.mock('@/db')                |
| PIN auth           | Cookie session (http-only, signed)        | Prostsze niz JWT, standard, debugowalne                                       |
| Device auth        | UUID w localStorage + whitelist w DB      | Bez zmian (obecna decyzja byla dobra)                                         |

### Hosting i infra

| Warstwa       | Wybor                                        | Dlaczego                                                                               |
| ------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| Hosting       | **Hetzner CX22/CX32 VPS + Docker Compose**   | Self-hosted dla RODO, pelna kontrola, backupy wlasne                                   |
| Reverse proxy | **Traefik v3**                               | Auto SSL przez Let's Encrypt, konfig przez Docker labels, prostsze niz Nginx + certbot |
| Orkiestracja  | Docker Compose (nie K8s, nie Kubernetes)     | Jeden salon = jeden VPS, K8s to overkill                                               |
| Backup DB     | `prodrigestivill/postgres-backup-local`      | W docker-compose, codzienny dump, rotacja 7 dni                                        |
| CI/CD         | GitHub Actions -> GHCR -> SSH docker pull    | Jeden workflow, atomowy deploy obrazem                                                 |
| Monitoring    | Healthcheck `/api/health` + Uptimerobot free | Minimum, wystarczy dla jednego salonu                                                  |
| Logi          | `docker compose logs` + rotate               | Bez ELK/Loki - za duzo dla jednego salonu                                              |

### Struktura repo

```
formen-pos/
├── apps/
│   ├── web/                   # Vite SPA (frontend)
│   │   ├── src/
│   │   └── package.json
│   └── api/                   # Hono + tRPC backend
│       ├── src/
│       │   ├── routers/       # tRPC routers per zasob
│       │   ├── db.ts          # Drizzle client
│       │   └── index.ts
│       └── package.json
├── packages/
│   ├── schema/                # Drizzle schema + Zod - zrodlo prawdy
│   │   ├── src/
│   │   │   ├── tables.ts      # Drizzle tables
│   │   │   └── dto.ts         # Zod input/output schemas
│   │   └── package.json
│   ├── trpc/                  # Wspolne typy AppRouter (export z api)
│   └── ui/                    # Wspolne komponenty (jesli pisze sie barberCal/barberTime)
├── turbo.json
├── pnpm-workspace.yaml
├── docker-compose.yml         # Production stack
├── Dockerfile                 # Multi-stage: build -> run
└── .github/workflows/deploy.yml
```

### Przyklady kodu

**tRPC router (backend):**

```ts
// apps/api/src/routers/salon.ts
import { router, protectedProcedure } from "../trpc";
import { salon } from "@pos/schema";
import { db } from "../db";
import { UpdateSalonInput } from "@pos/schema/dto";

export const salonRouter = router({
  get: protectedProcedure.query(async () => {
    const [row] = await db.select().from(salon).limit(1);
    return row;
  }),
  update: protectedProcedure.input(UpdateSalonInput).mutation(async ({ input }) => {
    await db.update(salon).set(input);
    return { ok: true };
  }),
});
```

**Component (frontend):**

```tsx
// apps/web/src/pages/Admin.tsx
import { api } from "@/lib/trpc";

export function AdminSalon() {
  const { data, isLoading } = api.salon.get.useQuery();
  const mutation = api.salon.update.useMutation({
    onSuccess: () => api.salon.get.invalidate(),
  });

  if (isLoading) return <Skeleton />;
  return <form onSubmit={(e) => mutation.mutate(formData)}>...</form>;
}
```

Zero kopiowania typow. Zmiana schematu Drizzle -> Zod input -> tRPC procedure -> auto-complete w komponencie. Koniec lancucha.

**Docker Compose (produkcja):**

```yaml
services:
  traefik:
    image: traefik:v3
    command:
      - --providers.docker
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.le.acme.tlschallenge=true
      - --certificatesresolvers.le.acme.email=${ADMIN_EMAIL}
    ports: ["80:80", "443:443"]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./letsencrypt:/letsencrypt

  app:
    image: ghcr.io/gresmopl/formen-pos:latest
    restart: always
    environment:
      DATABASE_URL: postgres://formen:${DB_PASS}@db:5432/formen
      ADMIN_PIN_HASH: ${ADMIN_PIN_HASH}
      SESSION_SECRET: ${SESSION_SECRET}
    labels:
      - traefik.http.routers.app.rule=Host(`formen.pl`)
      - traefik.http.routers.app.tls.certresolver=le
    depends_on: [db]

  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: formen
      POSTGRES_USER: formen
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes: [pgdata:/var/lib/postgresql/data]

  backup:
    image: prodrigestivill/postgres-backup-local
    restart: always
    environment:
      POSTGRES_HOST: db
      POSTGRES_DB: formen
      POSTGRES_USER: formen
      POSTGRES_PASSWORD: ${DB_PASS}
      SCHEDULE: "0 3 * * *"
      BACKUP_KEEP_DAYS: 30
      BACKUP_KEEP_WEEKS: 4
    volumes: [./backup:/backups]

volumes:
  pgdata:
```

Deploy:

```bash
# GitHub Action po merge do main:
# 1. docker build -t ghcr.io/gresmopl/formen-pos:latest .
# 2. docker push
# 3. ssh vps "cd /opt/formen && docker compose pull && docker compose up -d"
```

### Porownanie z trendami 2026

| Element         | Trend 2026            | Ten stack          | Ocena                         |
| --------------- | --------------------- | ------------------ | ----------------------------- |
| Framework       | Next.js 15 App Router | Vite SPA           | OK - PWA offline wymaga SPA   |
| UI              | shadcn/ui             | shadcn lub Mantine | OK - oba akceptowalne         |
| ORM             | Drizzle lub Prisma    | Drizzle            | Zgodne                        |
| API             | tRPC                  | tRPC               | Zgodne                        |
| Walidacja       | Zod                   | Zod                | Zgodne                        |
| Monorepo        | Turborepo             | Turborepo          | Zgodne                        |
| BaaS            | Supabase/Convex       | Self-hosted PG     | Rozbieznosc - swiadoma (RODO) |
| Hosting         | Vercel/Railway        | Hetzner VPS        | Rozbieznosc - swiadoma (dane) |
| Cache serwerowy | TanStack Query        | TanStack Query     | Zgodne                        |

**Wniosek:** 8/9 pozycji zgodne z trendami 2026. Rozbieznosci (BaaS, hosting) sa celowe, nie z niewiedzy - wynikaja z wymagan biznesowych (self-hosted dla danych finansowych).

### Co bym zrobil inaczej niz obecny stack

1. **Zrezygnowalbym z adapter pattern** - over-engineering dla jedna-baza-jeden-deploy. tRPC client + MSW + pg-mem daje te same korzysci (testowalnosc, flexibility) z duzo mniejszym kodem.
2. **tRPC zamiast REST** - end-to-end type safety, zero kopiowania typow.
3. **Drizzle zamiast surowego SQL + recznych typow** - jedno zrodlo prawdy dla schematu.
4. **Monorepo od dnia 1** - gotowe na barberCal/barberTime bez refactoringu.
5. **Docker Compose zamiast Nginx + systemd + certbot** - jeden plik opisuje cala produkcje.
6. **Cookie session zamiast JWT** - prostsze, nie potrzebuje PostgREST magic.
7. **pg-mem zamiast vi.mock** - realistyczne testy z prawdziwym SQL.
8. **react-hook-form zamiast Mantine useForm** - szybsze przy duzych formularzach.

### Ile by zabralo przepisanie

Hipotetyczna migracja istniejacego kodu na ten stack: **~3 tygodnie** (1 osoba pelny etat):

- Tydzien 1: monorepo setup + Drizzle schema z `schema.sql` + backend Hono + tRPC z endpointami
- Tydzien 2: migracja komponentow frontendowych (usuniecie adapter pattern, zamiana hookow `useDbQuery` na `api.*.useQuery`)
- Tydzien 3: testy + Docker Compose + CI/CD + smoke test PROD

**Czy warto?** Nie. Obecna aplikacja dziala. Retur z migracji (mniej kodu, lepsze DX) nie uzasadnia 3 tygodni pracy. Ten stack jest referencja na wypadek **nowego projektu** (np. barberCal od zera), albo gdybys mial wolny miesiac w przyszlosci.

---

## Alternatywa: SQLite + Hono zamiast PostgreSQL + PostgREST

**Kontekst:** Szef rozważa uproszczenie infrastruktury. Dotychczas salon dzialal na jednym pliku XML i to wystarczalo. SQLite to naturalny nastepca - jeden plik .db, zero serwisu bazodanowego.

**Pomysl:** Zamiast PostgreSQL + PostgREST na VPS -> Hono (Node.js) + better-sqlite3. Backend ~330 linii kodu dzieki generycznemu CRUD handlerowi (zamiast 76 indywidualnych endpointow).

### Architektura

```
Przegladarka -> HTTPS (Nginx) -> Hono (localhost:3000) -> SQLite (data.db)
```

| Komponent | RAM    | Opis                                |
| --------- | ------ | ----------------------------------- |
| Nginx     | ~20 MB | Reverse proxy + SSL                 |
| Hono/Node | ~50 MB | Backend API + better-sqlite3        |
| SQLite    | ~0 MB  | Plik .db, brak osobnego procesu     |
| **Razem** | ~70 MB | vs ~250 MB dla PostgreSQL+PostgREST |

### Struktura backendu (~330 linii)

```
backend/
├── server.ts          # ~40 linii - Hono setup, CORS, static
├── db.ts              # ~30 linii - better-sqlite3 init + schema
├── crud.ts            # ~60 linii - generyczny GET/POST/PUT/DELETE
└── routes/
    ├── transactions.ts  # ~80 linii - create + cancel (BEGIN/COMMIT)
    ├── reports.ts       # ~40 linii - zamkniecie zmiany + statystyki
    ├── cash.ts          # ~50 linii - ruchy kasowe z side-effectami
    └── devices.ts       # ~30 linii - rejestracja urzadzen
```

### Zalety vs PostgreSQL

- **Backup** = `scp data.db` (jeden plik) vs `pg_dump`
- **Setup VPS** = zero konfiguracji DB (brak postgresql.conf, brak userow DB, brak tune'owania)
- **RAM** = ~70 MB vs ~250 MB
- **Restart VPS** = PM2 wstaje sam, SQLite to plik - zero recovery
- **Disaster recovery** = skopiuj plik .db, gotowe

### Wady

- Brak PostgREST (trzeba napisac backend, ale to ~330 linii)
- Brak Supabase Studio (trzeba CLI albo Adminer-like tool)
- Concurrent writes: SQLite WAL mode wystarczy dla jednego salonu, ale nie skaluje sie do wielu

### Wplyw na frontend

**Zero.** REST adapter juz istnieje (291 linii, 43 metody). Dopasowanie formatu odpowiedzi Hono do tego co adapter oczekuje = ~3-4h pracy.

### Pracochlannosc

~1 sesja robocza (Claude Code). Schema PostgreSQL -> SQLite prawie 1:1 (enums -> CHECK constraints). Logika custom routes przepisana z adaptera supabase.

### Decyzja

Do podjecia po Fazie 2. Mozna zrealizowac razem z deploy PROD na Hetzner - wtedy zamiast instalowac PostgreSQL, stawia sie Hono + SQLite.

### Powiazanie z uproszczeniem platnosci

Szef rozważa rownoczesnie usuniecie wyboru formy zaplaty przy sprzedazy (patrz nizej). Jesli obie zmiany wejda, to dobry moment na zrobienie ich razem - mniej kodu do przepisywania.

---

## Wymagania szefa (spotkanie 2026-04-17) + prototyp HTML

**Kontekst:** Spotkanie z szefem 2026-04-17 - zebrane wymagania biznesowe. Dodatkowo szef dostarczyl prototyp HTML (`temp/example.html`) pokazujacy idealny wyglad aplikacji gdyby projektowac od nowa.

### Wymagania biznesowe do implementacji

| #   | Zmiana                    | Opis                                                                                                                                                                                             | Zlozonosc         |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| 1   | Likwidacja form platnosci | Wszystko = gotowka (karta, blik, bon - bez rozroznienia). Usunac SplitPaymentModal, ENUM payment_method, enabledPaymentMethods z AdminSettings                                                   | duza (~19 plikow) |
| 2   | PIN klawiatura numeryczna | Na telefonie szefa pokazuje sie alfanumeryczna. Dodac `inputMode="numeric"` do PinInput/TextInput w 4 plikach: PinModal.tsx, Admin.tsx, History.tsx, DeviceGate.tsx                              | mala              |
| 3   | Staly BottomNavBar        | 5 przyciskow na stale na dole kazdej strony: Panel glowny (/), Historia (/history), Portfel (/cash), Zakupy (/pos), Zamkniecie zmiany (/shift-close). Nowy komponent layout, modyfikacja App.tsx | srednia           |
| 4   | Portfel pracownika        | Nowy widok: suma napiwkow kartowych + wplat wlasnych (own_cash_deposit) = kwota do odbioru. Dane czesciowo istnieja (tipBalance, own_cash_deposit)                                               | srednia           |
| 5   | Koperta 0 zl dozwolone    | Przy zamknieciu zmiany mozna wpisac 0 do koperty (dzien bez utargu). Blad w ShiftClose.tsx:37-38 - `!Number(0)` jest true                                                                        | mala (1 linia)    |
| 6   | Historia filtr od/do      | DatePickerInput z kalendarzem zamiast "od ostatniego zamkniecia". Domyslnie od=dzisiaj, do=dzisiaj                                                                                               | mala/srednia      |
| 7   | Bon w POS                 | 3. zakladka w POS (Uslugi, Produkty, Bony). Przeniesienie z Kasy. Bon bez prowizji (juz dziala w commission.ts:15)                                                                               | srednia           |
| 8   | Kolejnosc uslug           | Konfigurowalny display_order w POS. Nowa kolumna w DB + UI do zarzadzania w AdminPricing                                                                                                         | srednia           |
| 9   | Raport terminala          | Dwa mechanizmy: (a) biezacy wpis w ciagu dnia - sprawdzenie ile gotowki w kasie, (b) krok posredni w ShiftClose PRZED liczeniem gotowki                                                          | srednia           |
| 10  | Kolory przyciskow         | Zasada globalna: wyplata = czerwony, wplata = zielony. Znany blad: TipTab.tsx "Potwierdz wyplate" jest green zamiast red                                                                         | mala              |
| 11  | Panel pracownika          | Usunac "Oczekiwany stan kasy" i "Twoja prowizja" z isPersonal. Dodac przycisk "Sprzedaz" + wyeksponowac ilosc uslug                                                                              | mala              |
| 12  | Zakupy bez rozliczenia    | Prosta wyplata z kasy + opis. Usunac expense_settle, SettleModal, pending expenses                                                                                                               | srednia           |

### Co sie laczy

- **Likwidacja platnosci + raport terminala** - jedno wymusza drugie (system nie wie co karta, trzeba reczny wpis)
- **BottomNavBar + Portfel** - Portfel to nowy widok na stalym pasku
- **BottomNavBar + bon w POS** - "Zakupy" na pasku = POS ze sprzedaza bonow
- **Kasa (/cash)** - zostanie wchlonieta przez inny widok (do ustalenia pozniej)

### Sugerowana kolejnosc implementacji

1. Male fixy: PIN numeryczny, koperta=0, kolory przyciskow
2. Likwidacja form platnosci (duza zmiana, odblokuje raport terminala)
3. BottomNavBar + reorganizacja nawigacji
4. Portfel pracownika + panel pracownika
5. Bon w POS + kolejnosc uslug
6. Historia filtr dat + raport terminala
7. Zakupy bez rozliczenia

### Wnioski z prototypu HTML (temp/example.html)

Prototyp pokazuje idealny wyglad aplikacji. Ponizej elementy do przeniesienia do naszego projektu (Mantine UI, Tabler Icons zamiast emoji).

**Nowe koncepcje (nie mamy tego):**

| Element                  | Opis                                                                                                                                            | Priorytet                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Plywajacy cart bar       | Zielony pasek na dole POS: ilosc pozycji + kwota + "Podsumowanie >". Lepsze niz obecne podejscie                                                | wysoki                            |
| Action buttons pattern   | Ikona + tytul + podtytul + strzalka (np. "Wyjalem na zakupy / Kawa, srodki czystosci itp. >"). Uzyc w Kasie i wszedzie gdzie sa opcje do wyboru | wysoki                            |
| Hero section w Kasie     | Duza kwota "W kasie powinno byc: 155 zl" z podtekstem utargu. Bardzo czytelne                                                                   | wysoki                            |
| Success screen           | Duzy zielony check + kwota + pracownik po sprzedazy. Daje satysfakcje z ukonczenia                                                              | wysoki                            |
| Quick amounts w Portfelu | Przyciski 10 zl, 20 zl, Calosc do szybkiej wyplaty napiwkow. Touch-friendly                                                                     | sredni                            |
| Terminal check UI        | Wizualny feedback: zielony = OK, zolty = roznica. Z kwotami oczekiwana vs wpisana                                                               | sredni                            |
| Worker cards z border    | Zaokraglone karty z border zamiast flat list. Avatar + inicjaly + badge + ilosc uslug + strzalka                                                | sredni                            |
| Statusy pracownikow      | Odznaki gamifikacyjne: gold (MISTRZ), diamond (MISTRZ), green (SOLIDNY), gray (ROZWOJ). Element motywacyjny                                     | niski (do potwierdzenia z szefem) |

**Lepsze nazewnictwo z prototypu (naturalny jezyk):**

| Prototyp               | Nasz obecny      | Uwaga                  |
| ---------------------- | ---------------- | ---------------------- |
| "Wyjalem na zakupy"    | "Wydatek"        | naturalniejsze         |
| "Dolozylem drobne"     | "Wplata wlasna"  | naturalniejsze         |
| "Portfel"              | "Saldo napiwkow" | zgodne z decyzja szefa |
| "Sprawdz z terminalem" | brak             | nowa funkcja           |
| "Sprzedaj bon"         | "Sprzedaz bonu"  | krotsze, czytelniejsze |

**Co z prototypu NIE pasuje do naszych ustalen:**

- BottomNav 4 przyciski - szef chce 5 (Panel glowny, Historia, Portfel, Zakupy, Zamkniecie zmiany)
- Bon w Kasie - szef chce bon w POS (3. zakladka)
- Brak filtra dat w Historii - szef chce od/do z kalendarzem
- Emoji zamiast ikon - my uzywamy Tabler Icons (spojnosc z Mantine)
- Kolor #10a060 - my mamy wlasny motyw Mantine (zachowac spojnosc)

### Przyklady kodu z prototypu do adaptacji

**Cart bar (plywajacy pasek koszyka):**

```tsx
// Mantine equivalent of prototype's .cart-bar
<Box pos="fixed" bottom={80} left={0} right={0} bg="green" c="white" p="md"
     style={{ zIndex: 100, boxShadow: "0 -4px 12px rgba(0,0,0,0.1)" }}>
  <Group justify="space-between">
    <div>
      <Text fz="xs" opacity={0.9}>{count} pozycji</Text>
      <Text fz="xl" fw={700}>{total} zl</Text>
    </div>
    <Text fz="sm" fw={600}>Podsumowanie ></Text>
  </Group>
</Box>
```

**Action button pattern:**

```tsx
// Mantine equivalent of prototype's .action-btn
<UnstyledButton
  w="100%"
  p="md"
  style={{
    border: "1px solid var(--mantine-color-default-border)",
    borderRadius: "var(--mantine-radius-md)",
  }}
>
  <Group gap="md" wrap="nowrap">
    <ThemeIcon size={44} radius="md" variant="light" color="orange">
      <IconShoppingCart size={22} />
    </ThemeIcon>
    <div style={{ flex: 1 }}>
      <Text fw={600} fz="md">
        Wyjalem na zakupy
      </Text>
      <Text fz="xs" c="dimmed">
        Kawa, srodki czystosci itp.
      </Text>
    </div>
    <IconChevronRight size={20} color="var(--mantine-color-dimmed)" />
  </Group>
</UnstyledButton>
```

---

## Uproszczenie systemu platnosci (POTWIERDZONE 2026-04-17)

**Status:** Potwierdzone przez szefa na spotkaniu 2026-04-17. Wszystko = gotowka. Bon tez traktowany jako gotowka (ale mechanizm bonu zostaje - saldo, waznosc).

**Kontekst:** Szef chce usunac wybor formy zaplaty przy rejestracji sprzedazy. Argument: roztargnieni fryzjerzy klikaja "karta" a przyjmuja gotowke (lub odwrotnie) i kasa sie rozjezdza. Terminal platniczy jest nieomylnym zrodlem prawdy o platosciach elektronicznych.

### Nowy flow sprzedazy

1. Wybierz uslugi/produkty -> "Zaplac" -> gotowe (zero pytan o forme)
2. Bon: 3. zakladka w POS (obok Uslug i Produktow), bez prowizji

### Nowy flow zamkniecia zmiany

1. Wybor pracownika zamykajacego
2. **Krok posredni: raport terminala** - wpisanie kwoty z terminala (karta + BLIK)
3. System od razu pokazuje ile powinno byc gotowki
4. Wpisanie gotowki (pogotowie + koperta, koperta moze byc 0 zl)
5. Porownanie z kwota systemowa -> roznica

### Co znika z UI

- PaymentModal (5 przyciskow: Gotowka/Karta/BLIK/Split/Bon)
- SplitPaymentModal
- Filtry formy zaplaty w Historii
- Checkboxy "dostepne metody platnosci" w Ustawieniach

### Co zostaje

- Bon podarunkowy (sprzedaz w POS jako 3. zakladka, realizacja przy platnosci)
- Prowizje (juz niezalezne od formy zaplaty)
- Ruchy kasowe (osobny mechanizm)

### Odpowiedzi szefa (2026-04-17)

1. **Bon:** tez traktowany jako gotowka (potwierdzone)
2. **Dashboard:** "Oczekiwany stan kasy" usunac z widoku pracownika (zostaje dla admina)
3. **Raport terminala:** biezacy wpis w ciagu dnia + krok posredni przy zamknieciu

### Wplyw na baze

- Kolumna `payment_method` w `transaction` -> nullable lub usunac
- Tabela `payment_detail` -> do usuniecia (zachowac tylko dla bonow)
- Nowe pole `terminal_amount NUMERIC(10,2)` w `daily_report`
- `calcSystemCash()` -> nowa logika oparta o terminal_amount

---

## Uproszczenie schematu bazy danych

**Kontekst:** Przy okazji migracji na SQLite+Hono mozna radykalnie uproscic schemat. Mniej tabel, mniej kolumn, czytelniejsze dane w DB Browser dla szefa.

### Redukcja tabel: 14 -> 10

| Tabela do usuniecia | Co zamiast                                   | Uzasadnienie                                  |
| ------------------- | -------------------------------------------- | --------------------------------------------- |
| `tip_withdrawal`    | `cash_movement` z reason='tip_withdrawal'    | Duplikat - dane juz trafiaja do cash_movement |
| `expense`           | `cash_movement` z polami status + final_cost | Wydatek to ruch kasowy z dwoma etapami        |
| `payment_detail`    | Zalezy od decyzji o platosciach              | Jesli szef zatwierdzi uproszczenie platnosci  |
| `client`            | Usunac (jesli nieuzywana)                    | Pytanie do szefa: czy ktos wpisuje klientow?  |

**Zostaje 10 tabel:** salon, employee, service, product, transaction, transaction_item, voucher, cash_movement, daily_report, device_registration.

Uwaga: `transaction_item` zostaje jako osobna tabela (nie JSON) - czytelniejsza w DB Browser i latwiejsza w zapytaniach raportowych.

### Usun `salon_id` z kazdej tabeli

Decyzja: "jeden salon = jedna baza". Mimo to kazda tabela ma `salon_id` i kazde zapytanie filtruje po nim. To martwy kod. Usuwamy kolumne z 10+ tabel, upraszczamy kazdy SELECT.

### Integer zamiast UUID

Szef w DB Browser widzi `id: 1` zamiast `id: a3f7b2c1-8d4e-4f6a-9c1b-3e5f7a2d8b4c`. Prostsze, czytelniejsze, szybsze. UUID ma sens w systemach rozproszonych - salon fryzjerski potrzebuje `INTEGER PRIMARY KEY AUTOINCREMENT`.

### Martwe kolumny w `salon` (usunac 7)

| Kolumna                   | Dlaczego usunac                     |
| ------------------------- | ----------------------------------- |
| `voucher_expiry_months`   | Zawsze 12, stala w kodzie           |
| `voucher_min_amount`      | Zawsze 1, stala w kodzie            |
| `voucher_code_prefix`     | Zawsze 'BON-', stala w kodzie       |
| `receipt_footer`          | Brak drukarki fiskalnej             |
| `knowledge_base_enabled`  | Feature flag, nieuzywany            |
| `cash_tolerance`          | Decyzja: pokazuj kazda roznice (=0) |
| `enabled_payment_methods` | Znika przy uproszczeniu platnosci   |

Zostaje: name, address, phone, nip, admin_pin_hash, operations_pin_hash, month_target, default_commission_service, default_commission_product.

### Nieuzywane kolumny w `service` (usunac 4)

| Kolumna            | Dlaczego usunac            |
| ------------------ | -------------------------- |
| `duration_minutes` | Brak kalendarza/rezerwacji |
| `category`         | Lista uslug jest krotka    |
| `description`      | Fryzjer wie co robi        |
| `description_long` | Nieuzywane                 |

Usluga sprowadza sie do: **nazwa + cena + price_from + is_active**.

### VIEWy po polsku (dla szefa w DB Browser)

Kod uzywa angielskich nazw tabel. Szef widzi polskie VIEWy:

```sql
CREATE VIEW pracownicy AS
  SELECT id, name AS imie, role AS rola,
         commission_service_percent AS prowizja_uslugi,
         tip_balance AS saldo_napiwkow, is_active AS aktywny
  FROM employee;

CREATE VIEW transakcje AS
  SELECT t.id, t.date AS data, e.name AS fryzjer,
         t.total_amount AS kwota, t.tip_amount AS napiwek, t.status
  FROM "transaction" t LEFT JOIN employee e ON e.id = t.employee_id;
```

### System urzadzen

Zostaje bez zmian. Analiza wykazala ze jest uzasadniony:

- Ochrona przed dostepem z zewnatrz
- Blokada konkretnego urzadzenia
- Widocznosc kto ma dostep
- Przypisanie fryzjera do urzadzenia (prowizje na personal view)

Wspolny PIN byłby prostszy ale nie pozwala blokowac pojedynczych urzadzen ani identyfikowac kto jest zalogowany.

### Kiedy realizowac

Razem z migracją na SQLite+Hono (i opcjonalnie z uproszczeniem platnosci). Wszystkie te zmiany sa "pakietowe" - lepiej zrobic je w jednym kroku niz po kolei.

---

## Inne pomysly (krotko)

### Label printer - etykieta jako plomba na kopercie

Nie paragon. Etykieta z nazwa salonu + data + godzina + suma - na koperte z gotowka przy zamknieciu zmiany. Rozwazyc integracje z Brother QL-800 albo Zebra.

### Moduly barberCal i barberTime

Kalendarz i time-tracking dla fryzjerow jako osobne mini-apki na tym samym VPS (stad decyzja o izolacji kont). Architektura modularna juz zakleplemnowa w memory.

### PWA offline fallback

ADR-003 wspomina o PWA docelowo. Kiedy POS dziala offline (padl internet w salonie), dane zapisuja sie lokalnie (IndexedDB) i synchronizuja po powrocie polaczenia. Adapter pattern juz to umozliwia - nowy `offline` adapter.

### Supabase Studio alternative

Jak nie ma Supabase w stacku, nie ma tez fajnego GUI do przegladania bazy. Alternatywy na VPS: pgAdmin 4 (ciezki), Adminer (lekki, jeden plik PHP), Directus (ciezki ale ladny).

---

_Plik aktualizowany spontanicznie - nie trzeba trzymac stricte chronologii._
