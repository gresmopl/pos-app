#!/usr/bin/env bash
# Daily encrypted backup of the pos-app PROD database (Supabase, schema "public").
#
# Runs pg_dump from a Docker image (no local Postgres client needed), encrypts the
# dump with a GPG public key (the private key lives only on the laptop) and rotates
# old files. Setup and restore: docs/backup.md
#
# Config file (chmod 600), default ~/.config/pos-backup/env:
#   DATABASE_URL=postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres
#   GPG_RECIPIENT=<key id or email of the backup public key>
#   BACKUP_DIR=~/backups/pos-app   (optional)
#   PG_IMAGE=postgres:17           (optional, major must be >= Supabase server major)
#   KEEP_DAILY=7 KEEP_WEEKLY=4     (optional)

set -euo pipefail

ENV_FILE="${POS_BACKUP_ENV:-$HOME/.config/pos-backup/env}"
# shellcheck source=/dev/null
source "$ENV_FILE"

: "${DATABASE_URL:?DATABASE_URL missing in $ENV_FILE}"
: "${GPG_RECIPIENT:?GPG_RECIPIENT missing in $ENV_FILE}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/pos-app}"
PG_IMAGE="${PG_IMAGE:-postgres:17}"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"
umask 077

stamp="$(date +%F_%H%M%S)"
target="$BACKUP_DIR/daily/pos-app_$stamp.dump.gpg"
tmp="$target.tmp"
trap 'rm -f "$tmp"' EXIT

log "dump start -> $target"

# The URL goes in via env, not argv, so the password does not show up in `ps`.
# --network host: Supabase direct connection may be IPv6-only, Docker bridge is not.
DATABASE_URL="$DATABASE_URL" docker run --rm -i --network host -e DATABASE_URL "$PG_IMAGE" \
  sh -c 'pg_dump "$DATABASE_URL" --format=custom --schema=public --no-owner --no-privileges' \
  | gpg --batch --yes --trust-model always --encrypt --recipient "$GPG_RECIPIENT" --output "$tmp"

if [ ! -s "$tmp" ]; then
  log "ERROR: empty backup file"
  exit 1
fi
mv "$tmp" "$target"
log "dump ok ($(du -h "$target" | cut -f1))"

# Sunday: keep a weekly copy too.
if [ "$(date +%u)" = 7 ]; then
  cp "$target" "$BACKUP_DIR/weekly/"
fi

rotate() {
  local dir="$1" keep="$2"
  # Names sort chronologically; find (not ls) so an empty dir is not an error.
  find "$dir" -maxdepth 1 -name '*.dump.gpg' | sort -r | tail -n +"$((keep + 1))" | xargs -r rm -f --
}
rotate "$BACKUP_DIR/daily" "$KEEP_DAILY"
rotate "$BACKUP_DIR/weekly" "$KEEP_WEEKLY"

log "done"
