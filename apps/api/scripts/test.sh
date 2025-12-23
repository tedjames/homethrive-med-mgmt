#!/bin/bash
set -e

CONTAINER_NAME="homethrive-postgres-test"
PORT="5433"
DB="homethrive_test"
USER="homethrive_test"
PASS="test_password"
DATABASE_URL="postgresql://${USER}:${PASS}@localhost:${PORT}/${DB}"

# Check if test DB is already running
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Test database already running, using existing container"
  STARTED_DB=false
else
  echo "Starting test database (Postgres 16) on localhost:${PORT}..."

  # Remove stale container if it exists
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  fi

  docker run -d \
    --name "${CONTAINER_NAME}" \
    -e POSTGRES_DB="${DB}" \
    -e POSTGRES_USER="${USER}" \
    -e POSTGRES_PASSWORD="${PASS}" \
    -p "${PORT}:5432" \
    postgres:16-alpine >/dev/null

  STARTED_DB=true

  echo "Waiting for database to be ready..."
  for i in {1..60}; do
    if docker exec "${CONTAINER_NAME}" pg_isready -U "${USER}" -d "${DB}" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
fi

# Run migrations to set up schema
export DATABASE_URL
export NODE_ENV="test"
export ENABLE_CLERK="false"
echo "Running database migrations..."
pnpm --filter @homethrive/db db:migrate

# Run tests, capture exit code
set +e
pnpm vitest run "$@"
TEST_EXIT_CODE=$?
set -e

# Only tear down if we started it
if [ "$STARTED_DB" = true ]; then
  echo "Stopping test database..."
  docker rm -f "${CONTAINER_NAME}" >/dev/null
fi

exit $TEST_EXIT_CODE
