# @homethrive/db

Database package implementing repository interfaces from `@homethrive/core` using DrizzleORM for Postgres.

## Overview

- **PostgreSQL with Drizzle ORM**: Type-safe SQL query builder with schema-driven migrations
- **Repository Pattern**: Concrete implementations of core repository interfaces (ports)
- **Connection Pooling**: Optimized for AWS Lambda with RDS Proxy support
- **Database Constraints**: Unique keys, foreign keys, and indexes enforce business invariants
- **Idempotent Operations**: `ON CONFLICT DO NOTHING` for safe retries and concurrency
- **Test-Friendly**: Integration tests against Docker Postgres, separate test database on port 5433

---

## Purpose

The `@homethrive/db` package bridges the gap between domain logic (`@homethrive/core`) and data persistence (PostgreSQL). It provides:

1. **Schema Definition**: Drizzle schema files defining tables, enums, indexes, and constraints
2. **Migration Management**: SQL migration files generated from schema, with scripts to apply/rollback
3. **Repository Implementations**: Concrete classes that implement core's repository interfaces
4. **Connection Management**: Database connection pooling optimized for serverless environments
5. **Test Infrastructure**: Factories and setup for integration testing

### Architectural Role

```
┌──────────────────────────────────────────────────────────┐
│                      apps/api                            │
│                     (Fastify)                            │
└───────────────────────┬──────────────────────────────────┘
                        │ uses services from
                        ▼
┌──────────────────────────────────────────────────────────┐
│                  @homethrive/core                        │
│              (Business Logic & Ports)                    │
│   • Services (use cases)                                 │
│   • Repository interfaces (ports)                        │
└───────────────────────┬──────────────────────────────────┘
                        ▲ implements ports
                        │
┌───────────────────────────────────────────────────────────┐
│                   @homethrive/db                          │
│              (Adapters & Persistence)                     │
│   • Drizzle schema & migrations                           │
│   • Repository implementations (adapters)                 │
│   • Connection management                                 │
│   • PostgreSQL (RDS or local Docker)                      │
└───────────────────────────────────────────────────────────┘
```

### Key Responsibilities

**Schema Management**:
- Define PostgreSQL tables, enums, and constraints using Drizzle schema
- Generate SQL migrations from schema changes
- Apply migrations to database environments (dev, staging, prod)

**Data Access**:
- Implement core repository interfaces with Drizzle queries
- Handle database transactions (atomic medication + schedules creation)
- Enforce idempotency via unique constraints and `ON CONFLICT` clauses

**Environment Isolation**:
- Local development: Docker Postgres on port 5432
- Testing: Separate Docker Postgres on port 5433
- Production: AWS RDS Postgres with RDS Proxy

---

## Setup

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for local development)
- PostgreSQL 16+ (if not using Docker)

### Installation

From the monorepo root:

```bash
pnpm install
```

### Environment Variables

Create a `.env` file in the package root or set environment variables:

```bash
# Development (default)
DATABASE_URL=postgresql://homethrive:dev_password@localhost:5432/homethrive_dev

# Test environment (separate/isolated database)
DATABASE_URL_TEST=postgresql://homethrive_test:test_password@localhost:5433/homethrive_test

# Production (RDS with RDS Proxy)
DATABASE_URL=postgresql://homethrive_prod:${DB_PASSWORD}@rds-proxy.us-east-1.rds.amazonaws.com:5432/homethrive
```

**Required Variables:**
- `DATABASE_URL`: Connection string for main database

**Optional Variables:**
- `DATABASE_URL_TEST`: Test database URL (defaults to `localhost:5433`)

### Local Development Setup

#### 1. Start Local Postgres (Docker)

```bash
# Start a development database
docker run -d \
  --name homethrive-postgres-dev \
  -e POSTGRES_DB=homethrive_dev \
  -e POSTGRES_USER=homethrive \
  -e POSTGRES_PASSWORD=dev_password \
  -p 5432:5432 \
  postgres:16-alpine
```

#### 2. Run Migrations

```bash
# Generate migrations from schema
pnpm --filter @homethrive/db db:generate

# Apply migrations to dev database
pnpm --filter @homethrive/db db:migrate

# Apply migrations to test database
DATABASE_URL=$DATABASE_URL_TEST pnpm --filter @homethrive/db db:migrate
```

#### 3. Verify Database

```bash
# Open Drizzle Studio (database GUI)
pnpm --filter @homethrive/db db:studio

# Or connect with psql
psql $DATABASE_URL
```

---

## Usage Guide

### Package Architecture

```
packages/db/
├── drizzle.config.ts           # Drizzle CLI configuration
├── migrations/                 # SQL migration files
│   ├── 0000_loose_doctor_doom.sql
│   ├── 0001_dusty_magik.sql
│   ├── 0002_sudden_overlord.sql
│   └── meta/
│       └── _journal.json       # Migration metadata
├── scripts/
│   ├── migrate.ts              # Apply migrations
│   ├── reset.ts                # Reset database (dev only)
│   └── test.sh                 # Start test DB and run tests
├── src/
│   ├── connection.ts           # Database connection & pooling
│   ├── lambda-migrate.ts       # Migration helper for Lambda
│   ├── schema/
│   │   ├── core.ts             # Table definitions
│   │   └── index.ts            # Schema exports
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── care-recipient.repository.ts
│   │   ├── medication.repository.ts
│   │   ├── schedule.repository.ts
│   │   ├── dose-taken.repository.ts
│   │   ├── index.ts            # Repository exports
│   │   └── __tests__/          # Integration tests
│   └── tests/
│       ├── factories.ts        # Test data generators
│       ├── globalSetup.ts      # Vitest global setup
│       └── setup.ts            # Test database helpers
└── index.ts                    # Barrel export
```

## Migrations

### Generate Migrations

```bash
# Generate SQL migrations from schema changes
pnpm --filter @homethrive/db db:generate

# This creates a new migration file in migrations/
```

### Apply Migrations

```bash
# Apply to dev database
pnpm --filter @homethrive/db db:migrate

# Apply to test database
DATABASE_URL=$DATABASE_URL_TEST pnpm --filter @homethrive/db db:migrate

# Apply to production (via CI/CD)
DATABASE_URL=$PROD_DATABASE_URL pnpm --filter @homethrive/db db:migrate
```

### Reset (Dev Only)

```bash
# Reset database (drops all tables)
pnpm --filter @homethrive/db db:reset

# Re-apply migrations
pnpm --filter @homethrive/db db:migrate
```

---

## Testing

### Integration Tests

Integration tests run against a real Docker Postgres database on port 5433. The `scripts/test.sh` script handles starting/stopping the Docker container:

```bash
# Run integration tests
pnpm --filter @homethrive/db test

# With coverage
pnpm --filter @homethrive/db test:coverage
```

### Test Script

The `scripts/test.sh` script:
1. Starts a Docker Postgres container on port 5433 (if not already running)
2. Sets `DATABASE_URL` and `NODE_ENV=test`
3. Runs `pnpm vitest run`
4. Stops the container (only if it started one)