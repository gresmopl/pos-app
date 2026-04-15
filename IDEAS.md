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
