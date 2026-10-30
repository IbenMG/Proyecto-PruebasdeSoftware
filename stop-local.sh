#!/usr/bin/env bash
set -eu

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
STATE_DIR="$ROOT/.local-logs"

STOP_DB=false
case "${1:-}" in
  --docker)
    STOP_DB=true
    ;;
  --help|-h)
    printf 'Uso: ./stop-local.sh [--docker]\n'
    printf '  --docker  También detiene PostgreSQL de CrowdStarter (Docker).\n'
    exit 0
    ;;
  "")
    ;;
  *)
    printf 'ERROR: opción no reconocida: %s\n' "$1" >&2
    printf 'Uso: ./stop-local.sh [--docker]\n' >&2
    exit 1
    ;;
esac

stop_one() {
  local name="$1"
  local pid_file="$2"
  local pid
  local attempt

  if [ ! -f "$pid_file" ]; then
    printf '%s no está iniciado.\n' "$name"
    return 0
  fi

  pid="$(cat "$pid_file" 2>/dev/null || true)"

  if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
    printf '%s ya estaba detenido.\n' "$name"
    rm -f "$pid_file"
    return 0
  fi

  printf 'Deteniendo %s (PID %s)...\n' "$name" "$pid"
  kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true

  for attempt in $(seq 1 20); do
    if ! kill -0 "$pid" 2>/dev/null; then
      break
    fi
    sleep 0.3
  done

  if kill -0 "$pid" 2>/dev/null; then
    kill -9 -- "-$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
  fi

  rm -f "$pid_file"
}

stop_one "backend" "$STATE_DIR/backend.pid"
stop_one "frontend" "$STATE_DIR/frontend.pid"

if [ "$STOP_DB" = true ]; then
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    printf 'Deteniendo PostgreSQL de CrowdStarter...\n'
    docker compose stop db >/dev/null 2>&1 || printf 'No se pudo detener el contenedor crowdstarter-postgres.\n'
  else
    printf 'Docker Compose no está disponible; PostgreSQL no se detuvo.\n'
  fi
elif [ "$(docker inspect -f '{{.State.Running}}' crowdstarter-postgres 2>/dev/null || true)" = "true" ]; then
  printf 'PostgreSQL de CrowdStarter sigue activo. Para detenerlo: ./stop-local.sh --docker\n'
fi

printf 'Listo.\n'
