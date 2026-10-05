#!/usr/bin/env bash
# Laptop side (Windows, Git Bash): copy new encrypted DB backups from the VPS.
# Only files missing locally are downloaded, so a laptop that was off for a few
# days catches up on the next run. Setup: docs/backup.md
#
# Env overrides: VPS_HOST, VPS_PORT, REMOTE_DIR, LOCAL_DIR, KEEP_LOCAL

set -euo pipefail

VPS_HOST="${VPS_HOST:-ai@178.104.140.104}"
VPS_PORT="${VPS_PORT:-2222}"
REMOTE_DIR="${REMOTE_DIR:-backups/pos-app}"
LOCAL_DIR="${LOCAL_DIR:-$HOME/backups/pos-app}"
KEEP_LOCAL="${KEEP_LOCAL:-60}"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }

mkdir -p "$LOCAL_DIR"

# BatchMode: fail instead of hanging on a password prompt when run from Task Scheduler.
remote_files=$(ssh -p "$VPS_PORT" -o BatchMode=yes "$VPS_HOST" \
  "find $REMOTE_DIR -name '*.dump.gpg' -printf '%P\n'")

copied=0
for rel in $remote_files; do
  name="$(basename "$rel")"
  [ -e "$LOCAL_DIR/$name" ] && continue
  scp -P "$VPS_PORT" -o BatchMode=yes -p "$VPS_HOST:$REMOTE_DIR/$rel" "$LOCAL_DIR/$name.tmp"
  mv "$LOCAL_DIR/$name.tmp" "$LOCAL_DIR/$name"
  copied=$((copied + 1))
done
log "copied $copied new file(s) to $LOCAL_DIR"

# Laptop keeps a longer history than the VPS (default: 60 newest files).
find "$LOCAL_DIR" -maxdepth 1 -name '*.dump.gpg' | sort -r | tail -n +"$((KEEP_LOCAL + 1))" | xargs -r rm -f --
