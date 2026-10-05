# Backup bazy PROD (Supabase)

Codzienna, szyfrowana kopia schematu `public` bazy produkcyjnej (tabele, dane, funkcje
np. `increment_tip_balance`, typy ENUM). Aplikacja nie uzywa Supabase Storage ani
Supabase Auth, wiec `public` to cala zawartosc biznesowa.

```
Supabase (Postgres) --pg_dump 03:00--> VPS ~/backups/pos-app/{daily,weekly}/*.dump.gpg
                                          |
                     laptop (Task Scheduler) --scp--> C:\Users\<user>\backups\pos-app\
```

- **Szyfrowanie:** GPG kluczem publicznym. Klucz prywatny jest tylko na laptopie, VPS
  potrafi szyfrowac, ale nie odszyfruje kopii.
- **Rotacja:** VPS trzyma 7 dziennych + 4 tygodniowe (niedziela), laptop 60 ostatnich plikow.
- **Skrypty:** `scripts/backup-db.sh` (VPS, cron), `scripts/backup-pull.sh` (laptop, Git Bash).

## Setup

### 1. Laptop: klucz GPG (Git Bash)

```bash
gpg --quick-gen-key "pos-app backup" default default never   # ustaw haslo i zapisz w menedzerze hasel
gpg --armor --export "pos-app backup" > pos-backup-public.asc
gpg --armor --export-secret-keys "pos-app backup" > pos-backup-PRIVATE.asc
```

`pos-backup-PRIVATE.asc` przechowuj poza laptopem (np. pendrive / menedzer hasel).
**Bez klucza prywatnego i hasla kopie sa nie do odczytania.**

Skopiuj klucz publiczny na VPS:

```bash
scp -P 2222 pos-backup-public.asc ai@178.104.140.104:~
```

### 2. VPS: konfiguracja i cron

```bash
gpg --import ~/pos-backup-public.asc && rm ~/pos-backup-public.asc
mkdir -p ~/.config/pos-backup && chmod 700 ~/.config/pos-backup
nano ~/.config/pos-backup/env && chmod 600 ~/.config/pos-backup/env
```

Zawartosc `env`:

```bash
DATABASE_URL='postgresql://postgres:<HASLO>@db.<ref>.supabase.co:5432/postgres'
GPG_RECIPIENT='pos-app backup'
PG_IMAGE=postgres:17
```

- Connection string: panel Supabase -> Connect. Polaczenie bezposrednie (direct) jest
  w Supabase domyslnie po IPv6; VPS ma IPv6, a skrypt uzywa `--network host`. Gdyby
  nie dzialalo, uzyj connection stringa "Session pooler" (port 5432).
- `PG_IMAGE`: wersja glowna `pg_dump` musi byc >= wersji serwera Supabase
  (sprawdz: `select version();` w SQL Editorze).

Test reczny, potem cron (03:00 czasu Europe/Warsaw, salon zamkniety):

```bash
bash /code/pos-app/scripts/backup-db.sh && ls -la ~/backups/pos-app/daily
mkdir -p ~/backups/pos-app
( crontab -l 2>/dev/null; echo '0 3 * * * bash /code/pos-app/scripts/backup-db.sh >> $HOME/backups/pos-app/backup.log 2>&1' ) | crontab -
```

### 3. Laptop: automatyczne pobieranie

Wymaga logowania SSH do VPS kluczem bez pytania o haslo (`ssh -p 2222 -o BatchMode=yes ai@178.104.140.104 true`
musi przejsc). Test reczny w Git Bash:

```bash
bash /c/code/pos-app/scripts/backup-pull.sh
```

Harmonogram zadan Windows (cmd/PowerShell):

```
schtasks /create /tn "pos-app backup pull" /sc daily /st 09:00 /tr "\"C:\Program Files\Git\bin\bash.exe\" -lc 'bash /c/code/pos-app/scripts/backup-pull.sh >> ~/backups/pos-app/pull.log 2>&1'"
```

Potem w GUI Harmonogramu zadan -> wlasciwosci zadania -> Ustawienia: zaznacz
"Uruchom zadanie jak najszybciej po pominieciu zaplanowanego uruchomienia"
(laptop o 09:00 moze byc wylaczony).

## Odtwarzanie

Przetestowane 2026-10-05 na Postgres 16 -> 17 (liczba wierszy we wszystkich tabelach zgodna).

```bash
# 1. Odszyfruj (laptop, pyta o haslo klucza)
gpg --decrypt pos-app_YYYY-MM-DD_HHMMSS.dump.gpg > restore.dump

# 2. Odtworz do pustej bazy (nowy projekt Supabase albo lokalny Postgres)
pg_restore -d '<DATABASE_URL docelowej bazy>' --clean --if-exists --no-owner --no-privileges --exit-on-error restore.dump

# 3. Usun odszyfrowany plik (dane osobowe)
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

- Log VPS: `tail ~/backups/pos-app/backup.log` (kazdy przebieg konczy sie linia `done`).
- Log laptopa: `~/backups/pos-app/pull.log`.
- Raz na kwartal: test odtworzenia ostatniej kopii (sekcja wyzej).
