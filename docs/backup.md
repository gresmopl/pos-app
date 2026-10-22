# Backup bazy PROD (Supabase)

Codzienna, szyfrowana kopia schematu `public` bazy produkcyjnej (tabele, dane, funkcje
np. `increment_tip_balance`, typy ENUM). Aplikacja nie uzywa Supabase Storage ani
Supabase Auth, wiec `public` to cala zawartosc biznesowa.

```
GitHub Actions (cron 01:00 UTC) --pg_dump--> gpg (haslo) --> artifact (90 dni)
```

- **Workflow:** `.github/workflows/backup.yml`, uruchamiany codziennie i recznie (Run workflow).
- **Szyfrowanie:** GPG symetryczne (AES256) haslem z sekretu `BACKUP_PASSWORD`. Repo jest
  publiczne, wiec artifact moze pobrac kazdy zalogowany uzytkownik GitHub: bez hasla
  plik jest bezuzyteczny.
- **Rotacja:** GitHub sam usuwa artifacty po 90 dniach.

## Setup (jednorazowo, w przegladarce)

1. Supabase -> Connect -> connection string **Session pooler** (port 5432).
   Polaczenie direct jest tylko po IPv6, a runnery GitHub nie maja IPv6.
2. GitHub -> repo -> Settings -> Secrets and variables -> Actions -> New repository secret:
   - `DATABASE_URL` = connection string z punktu 1 (z haslem),
   - `BACKUP_PASSWORD` = dlugie losowe haslo. **Zapisz je w Vaultwarden.** Bez niego
     kopie sa nie do odczytania.
3. Workflow musi byc na `main` (GitHub uruchamia cron i reczne odpalenie tylko z
   domyslnej galezi). Po merge: Actions -> DB Backup -> Run workflow, sprawdz czy
   przebieg jest zielony i ma artifact.

Uwaga: w publicznym repo GitHub wylacza zaplanowane workflow po 60 dniach bez zadnej
aktywnosci w repo (dostaniesz maila). Wtedy wystarczy wlaczyc je ponownie w Actions.

## Odtwarzanie

```bash
# 1. Pobierz artifact (Actions -> przebieg -> Artifacts) i rozpakuj zip
# 2. Odszyfruj (Git Bash, pyta o BACKUP_PASSWORD)
gpg --decrypt pos-app_YYYY-MM-DD_HHMMSS.dump.gpg > restore.dump

# 3. Odtworz do pustej bazy (nowy projekt Supabase albo lokalny Postgres)
pg_restore -d '<DATABASE_URL docelowej bazy>' --clean --if-exists --no-owner --no-privileges --exit-on-error restore.dump

# 4. Usun odszyfrowany plik (dane osobowe)
rm restore.dump
```

- `--clean --if-exists` jest potrzebne, bo zrzut zawiera `CREATE SCHEMA public`, a ten
  schemat juz istnieje w kazdej nowej bazie.
- Docelowa baza musi miec rozszerzenia `uuid-ossp` i `pgcrypto` w schemacie `extensions`
  (Supabase ma je domyslnie). W czystym Postgresie najpierw:
  `create schema extensions; create extension "uuid-ossp" schema extensions; create extension pgcrypto schema extensions;`
  oraz role `anon`, `authenticated`, `service_role`.
- Bez lokalnego `pg_restore` mozna uzyc Dockera: `docker run --rm -i postgres:17 pg_restore ... < restore.dump`.

## Kontrola

- Nieudany przebieg = mail od GitHub (domyslne powiadomienia o failed workflow).
- Raz na kwartal: test odtworzenia ostatniej kopii (sekcja wyzej).
