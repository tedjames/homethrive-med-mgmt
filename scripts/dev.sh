#!/bin/bash
# =============================================================================
# HomeThrive Local Development Environment
# =============================================================================
# Starts the complete local dev environment with:
# - Local Postgres (Docker) on port 5437
# - Fastify API server on port 3200
# - TanStack Start dev server on port 5200
#
# Usage:
#   ./scripts/dev.sh
#   pnpm dev

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
info() { echo -e "${CYAN}→${NC} $1"; }

# Config
CONTAINER_NAME="homethrive-postgres-dev"
DB_PORT="5437"
API_PORT="3200"
WEB_PORT="5200"
DB_NAME="homethrive_dev"
DB_USER="homethrive"
DB_PASS="dev_password"

echo "=========================================="
echo "  HomeThrive Development Environment     "
echo "=========================================="
echo ""

cd "$ROOT_DIR"

# --------------------
# Step 1: Check for .env files
# --------------------
if [ ! -f "apps/api/.env" ]; then
  error "API .env file not found!"
  echo "  Run 'pnpm setup' first to configure your environment"
  exit 1
fi

if [ ! -f "apps/web/.env" ]; then
  error "Web .env file not found!"
  echo "  Run 'pnpm setup' first to configure your environment"
  exit 1
fi

success "Environment files found"

# --------------------
# Step 2: Clean up any existing processes on our ports
# --------------------
kill_port() {
  local port=$1
  local pid
  pid=$(lsof -i :$port -t 2>/dev/null | head -1)
  if [[ -n "$pid" ]]; then
    warn "Found process on port $port (PID: $pid) - killing it..."
    kill "$pid" 2>/dev/null || true
    sleep 0.5
    # Force kill if still running
    if lsof -i :$port -t >/dev/null 2>&1; then
      kill -9 "$pid" 2>/dev/null || true
      sleep 0.5
    fi
    success "Freed port $port"
  fi
}

info "Checking for existing processes..."
kill_port $API_PORT  # API port
kill_port $WEB_PORT  # Web port

# --------------------
# Step 3: Ensure Docker is running
# --------------------
info "Checking Docker..."

if ! docker info > /dev/null 2>&1; then
  error "Docker is not running"
  echo "  Please start Docker Desktop and try again"
  exit 1
fi

success "Docker is running"

# --------------------
# Step 4: Ensure dev database is running
# --------------------
info "Checking dev database..."

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  success "Dev database already running (port ${DB_PORT})"
else
  info "Starting dev database..."

  # Remove stale container if exists
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  fi

  docker run -d \
    --name "${CONTAINER_NAME}" \
    -e POSTGRES_DB="${DB_NAME}" \
    -e POSTGRES_USER="${DB_USER}" \
    -e POSTGRES_PASSWORD="${DB_PASS}" \
    -p "${DB_PORT}:5432" \
    postgres:16-alpine >/dev/null

  echo "Waiting for database to be ready..."
  for i in {1..60}; do
    if docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done

  success "Dev database started (port ${DB_PORT})"
fi

# Verify connection
if nc -z localhost ${DB_PORT} 2>/dev/null; then
  success "Database connection verified"
else
  error "Cannot connect to database on port ${DB_PORT}"
  exit 1
fi

# --------------------
# Step 5: Run migrations
# --------------------
info "Running database migrations..."
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${DB_PORT}/${DB_NAME}" pnpm --filter @homethrive/db db:migrate
success "Migrations complete"

echo ""

# --------------------
# Step 6: Start API and Web servers
# --------------------
echo "=========================================="
info "Starting API and Web servers..."
echo "=========================================="
echo ""
info "Web:      http://localhost:${WEB_PORT}"
info "API:      http://localhost:${API_PORT}"
info "Database: localhost:${DB_PORT}"
echo ""
echo "Press Ctrl+C to stop all services"
echo "---"
echo ""

# Track PIDs for cleanup
API_PID=""
WEB_PID=""

cleanup() {
  echo ""
  info "Shutting down..."

  # Kill processes
  [[ -n "$API_PID" ]] && kill "$API_PID" 2>/dev/null
  [[ -n "$WEB_PID" ]] && kill "$WEB_PID" 2>/dev/null

  # Wait briefly for graceful shutdown
  sleep 0.5

  # Force kill if still running
  [[ -n "$API_PID" ]] && kill -9 "$API_PID" 2>/dev/null
  [[ -n "$WEB_PID" ]] && kill -9 "$WEB_PID" 2>/dev/null

  wait 2>/dev/null

  success "All services stopped"
  echo ""
  echo "Note: Database container still running. Stop with:"
  echo "  docker stop ${CONTAINER_NAME}"
  exit 0
}

trap cleanup INT TERM

# Start API in background
pnpm --filter @homethrive/api dev &
API_PID=$!

# Small delay to let API start first
sleep 1

# Start Web in background
pnpm --filter @homethrive/web dev &
WEB_PID=$!

# Wait indefinitely - Ctrl+C will trigger cleanup
wait
