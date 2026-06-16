#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
FRONTEND_URL="http://localhost:5173"

log() { printf "\033[1;36m[rusanorder]\033[0m %s\n" "$*"; }

# 1. Docker Desktop
if ! docker info >/dev/null 2>&1; then
  log "Iniciando Docker Desktop..."
  open -a "Docker"
  log "Aguardando o Docker ficar pronto..."
  until docker info >/dev/null 2>&1; do
    sleep 2
  done
fi
log "Docker pronto."

# 2. Banco de dados (MySQL via docker compose)
log "Subindo container do banco..."
(cd "$PROJECT_DIR" && docker compose up -d)

log "Aguardando MySQL aceitar conexões em localhost:3306..."
until docker exec rusanorder-database mysqladmin ping -h "127.0.0.1" -uroot -proot --silent >/dev/null 2>&1; do
  sleep 2
done
log "MySQL pronto."

# 3. Backend em uma nova aba do iTerm (depois do banco)
log "Abrindo backend em nova aba do iTerm..."
osascript <<EOF
tell application "iTerm"
  activate
  if (count of windows) = 0 then
    create window with default profile
  else
    tell current window to create tab with default profile
  end if
  tell current session of current window
    write text "cd '$BACKEND_DIR' && npm run dev"
  end tell
end tell
EOF

# 4. Frontend em uma nova aba do iTerm
log "Abrindo frontend em nova aba do iTerm..."
osascript <<EOF
tell application "iTerm"
  activate
  if (count of windows) = 0 then
    create window with default profile
  else
    tell current window to create tab with default profile
  end if
  tell current session of current window
    write text "cd '$FRONTEND_DIR' && npm run dev"
  end tell
end tell
EOF

# 5. Aguarda o Vite responder e abre o navegador
log "Aguardando frontend responder em $FRONTEND_URL..."
until curl -s -o /dev/null "$FRONTEND_URL"; do
  sleep 1
done
log "Abrindo $FRONTEND_URL no navegador."
open "$FRONTEND_URL"

log "Tudo no ar."
