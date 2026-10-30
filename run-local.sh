#!/usr/bin/env bash
set -eu

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

MODE="postgres"

STATE_DIR="$ROOT/.local-logs"
BACKEND_PID_FILE="$STATE_DIR/backend.pid"
FRONTEND_PID_FILE="$STATE_DIR/frontend.pid"
BACKEND_LOG="$STATE_DIR/backend.log"
FRONTEND_LOG="$STATE_DIR/frontend.log"
BACKEND_URL="http://127.0.0.1:8000/api/campanias/"
FRONTEND_URL="http://127.0.0.1:5173/"

mkdir -p "$STATE_DIR"

msg() {
  printf '%s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

is_running() {
  local pid_file="$1"
  [ -f "$pid_file" ] || return 1
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

wait_for_url() {
  local url="$1"
  local log="$2"
  local pid="$3"
  local attempt

  for attempt in $(seq 1 40); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      msg "--- Últimas líneas de $log ---"
      tail -n 30 "$log" 2>/dev/null || true
      return 1
    fi
    sleep 1
  done

  msg "--- Últimas líneas de $log ---"
  tail -n 30 "$log" 2>/dev/null || true
  return 1
}

for arg in "$@"; do
  case "$arg" in
    --sqlite)
      if [ "$MODE" = "docker" ]; then
        fail "No se pueden combinar --sqlite y --docker."
      fi
      MODE="sqlite"
      ;;
    --docker)
      if [ "$MODE" = "sqlite" ]; then
        fail "No se pueden combinar --sqlite y --docker."
      fi
      MODE="docker"
      ;;
    --help|-h)
      printf 'Uso: ./run-local.sh [--sqlite | --docker]\n'
      printf '  --sqlite  Usa SQLite local en lugar de PostgreSQL.\n'
      printf '  --docker  Levanta PostgreSQL de CrowdStarter en Docker (puerto 5433).\n'
      exit 0
      ;;
    *)
      printf 'ERROR: opción no reconocida: %s\n' "$arg" >&2
      printf 'Uso: ./run-local.sh [--sqlite | --docker]\n' >&2
      exit 1
      ;;
  esac
done

if is_running "$BACKEND_PID_FILE" || is_running "$FRONTEND_PID_FILE"; then
  msg "CrowdStarter ya está iniciado."
  msg "  Aplicación: http://localhost:5173"
  msg "  Backend:    http://localhost:8000"
  msg "Para detenerlo: ./stop-local.sh"
  exit 0
fi

if curl -fsS "$BACKEND_URL" >/dev/null 2>&1; then
  fail "El puerto 8000 ya está en uso por otro proceso. Deténlo antes de continuar."
fi

if curl -fsS "$FRONTEND_URL" >/dev/null 2>&1; then
  fail "El puerto 5173 ya está en uso por otro proceso. Deténlo antes de continuar."
fi

if [ -x "$ROOT/.venv/bin/python" ]; then
  PYTHON="$ROOT/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON="$(command -v python3)"
  if ! "$PYTHON" -c 'import django' >/dev/null 2>&1; then
    msg "Creando entorno virtual e instalando dependencias del backend..."
    "$PYTHON" -m venv "$ROOT/.venv" || fail "No se pudo crear .venv. Instala python3-venv."
    PYTHON="$ROOT/.venv/bin/python"
    "$PYTHON" -m pip install --upgrade pip
    "$PYTHON" -m pip install -r "$ROOT/requirements.txt"
  fi
else
  fail "Python 3 no está instalado."
fi

if [ "$MODE" = "sqlite" ]; then
  export DB_ENGINE="sqlite"
  export DB_NAME="${DB_NAME:-$ROOT/db.sqlite3}"
elif [ "$MODE" = "docker" ]; then
  command -v docker >/dev/null 2>&1 || fail "Docker no está instalado. Instala Docker Desktop o usa --sqlite."
  docker info >/dev/null 2>&1 || fail "Docker no está en ejecución. Abre Docker Desktop e inténtalo de nuevo."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose no está disponible."

  msg "Iniciando PostgreSQL de CrowdStarter en el puerto 5433..."
  if ! docker compose up -d db; then
    fail "No se pudo iniciar PostgreSQL con Docker Compose."
  fi

  DB_STATUS=""
  for attempt in $(seq 1 60); do
    DB_STATUS="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' crowdstarter-postgres 2>/dev/null || true)"
    case "$DB_STATUS" in
      healthy)
        break
        ;;
      unhealthy)
        docker compose logs --tail=30 db || true
        fail "PostgreSQL no quedó saludable. Revisa los logs del contenedor."
        ;;
    esac
    sleep 1
  done

  if [ "$DB_STATUS" != "healthy" ]; then
    docker compose logs --tail=30 db || true
    fail "PostgreSQL no respondió a tiempo. Revisa los logs del contenedor."
  fi

  export DB_ENGINE="django.db.backends.postgresql"
  export DB_NAME="${DB_NAME:-crowdstarter}"
  export DB_USER="${DB_USER:-masteruser}"
  export DB_PASSWORD="${DB_PASSWORD:-12345678}"
  export DB_HOST="${DB_HOST:-127.0.0.1}"
  export DB_PORT="${DB_PORT:-5433}"
else
  export DB_NAME="${DB_NAME:-crowdstarter}"
fi

msg "Aplicando migraciones..."
if ! "$PYTHON" manage.py migrate --noinput; then
  fail "No se pudieron aplicar las migraciones. Revisa la base de datos y las variables DB_*."
fi

msg "Iniciando backend..."
setsid nohup "$PYTHON" manage.py runserver 0.0.0.0:8000 >"$BACKEND_LOG" 2>&1 &
BACKEND_PID="$!"
echo "$BACKEND_PID" >"$BACKEND_PID_FILE"

if ! wait_for_url "$BACKEND_URL" "$BACKEND_LOG" "$BACKEND_PID"; then
  kill -- "-$BACKEND_PID" 2>/dev/null || true
  rm -f "$BACKEND_PID_FILE"
  fail "El backend no respondió. Revisa $BACKEND_LOG"
fi

if [ ! -d "$ROOT/frontend/node_modules" ] || ! "$ROOT/frontend/node_modules/.bin/vite" --version >/dev/null 2>&1; then
  msg "Instalando dependencias del frontend compatibles con este sistema..."
  (cd "$ROOT/frontend" && npm ci) || fail "No se pudieron instalar las dependencias del frontend."
fi

msg "Iniciando frontend..."
(
  cd "$ROOT/frontend"
  setsid nohup npm run dev -- --host 0.0.0.0 >"$FRONTEND_LOG" 2>&1 &
  echo "$!" >"$FRONTEND_PID_FILE"
)
FRONTEND_PID="$(cat "$FRONTEND_PID_FILE")"

if ! wait_for_url "$FRONTEND_URL" "$FRONTEND_LOG" "$FRONTEND_PID"; then
  kill -- "-$FRONTEND_PID" 2>/dev/null || true
  kill -- "-$BACKEND_PID" 2>/dev/null || true
  rm -f "$FRONTEND_PID_FILE" "$BACKEND_PID_FILE"
  fail "El frontend no respondió. Revisa $FRONTEND_LOG"
fi

msg ""
msg "CrowdStarter está disponible:"
msg "  Aplicación: http://localhost:5173"
msg "  Backend:    http://localhost:8000"
msg ""
if [ "$MODE" = "docker" ]; then
  msg "Base de datos: PostgreSQL en Docker (puerto $DB_PORT)"
elif [ "$MODE" = "sqlite" ]; then
  msg "Base de datos: SQLite ($DB_NAME)"
fi
msg "Logs: $STATE_DIR"
msg "Detener: ./stop-local.sh"
if [ "$MODE" = "docker" ]; then
  msg "Detener también PostgreSQL: ./stop-local.sh --docker"
fi
