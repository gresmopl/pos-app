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
| Testy DB           | **pg-mem** (in-memory PG)                 | Zastepuje adapter mock. Testy trafiaja realne zapytania SQL                   |
| Testy e2e          | Playwright                                | Standard branzowy, lepsze od Cypress w 2026                                   |
| Mockowanie fetch   | **MSW (Mock Service Worker)**             | Zastepuje adapter mock we frontend, przechwytuje network na poziomie SW       |
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
7. **pg-mem zamiast mock adaptera** - realistyczne testy z prawdziwym SQL.
8. **react-hook-form zamiast Mantine useForm** - szybsze przy duzych formularzach.

### Ile by zabralo przepisanie

Hipotetyczna migracja istniejacego kodu na ten stack: **~3 tygodnie** (1 osoba pelny etat):

- Tydzien 1: monorepo setup + Drizzle schema z `schema.sql` + backend Hono + tRPC z endpointami
- Tydzien 2: migracja komponentow frontendowych (usuniecie adapter pattern, zamiana hookow `useDbQuery` na `api.*.useQuery`)
- Tydzien 3: testy + Docker Compose + CI/CD + smoke test PROD

**Czy warto?** Nie. Obecna aplikacja dziala. Retur z migracji (mniej kodu, lepsze DX) nie uzasadnia 3 tygodni pracy. Ten stack jest referencja na wypadek **nowego projektu** (np. barberCal od zera), albo gdybys mial wolny miesiac w przyszlosci.

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
