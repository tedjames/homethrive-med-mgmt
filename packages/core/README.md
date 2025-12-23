# @homethrive/core

Domain logic package implementing hexagonal/clean architecture for the medication management app.

## Overview

- **Framework-agnostic business logic**: Zero dependencies on infrastructure concerns (AWS SDK, Drizzle, Fastify)
- **Domain-driven design**: Organized by business domains (care recipients, medications, schedules, doses)
- **Type-safe validation**: Zod schemas as single source of truth for runtime and compile-time types
- **Testable by design**: Services use functional factories with dependency injection, enabling 100% unit test coverage with mocked repositories
- **Timezone-aware**: DST-safe date/time operations using Luxon library

---

## Purpose

The `@homethrive/core` package is the heart of the our application - containing all business rules and domain logic. By maintaining strict architectural boundaries (hexagonal/clean architecture), this package ensures:

1. **Business logic isolation**: Domain rules are independent of infrastructure, frameworks, and external services
2. **Testability**: Services can be tested in isolation with mocked repository implementations
3. **Portability**: Core logic can be used in any context (Lambda, web server, CLI, tests) without modification
4. **Maintainability**: Clear separation of concerns makes the codebase easier to understand and modify

### Architectural Role

```
┌─────────────────────────────────────────────────────────────┐
│                         apps/api                            │
│                        (Fastify)                            │
└─────────────────────────┬───────────────────────────────────┘
                          │ depends on
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    @homethrive/core                         │
│                   (Business Logic)                          │
│  • Domain entities & schemas (Zod)                          │
│  • Service layer (use cases)                                │
│  • Repository interfaces (ports)                            │
│  • Domain errors                                            │
└─────────────────────────┬───────────────────────────────────┘
                          ▲ implements ports
                          │
┌─────────────────────────────────────────────────────────────┐
│                      @homethrive/db                         │
│                 (Drizzle + Postgres)                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

**Dependency Rule**: Core depends on nothing external. All infrastructure concerns (database, AWS services, HTTP frameworks) depend on core and implement its interfaces.

**Entity-First Design**: Entities are pure TypeScript interfaces with no methods. Behavior lives in services.

**Ports & Adapters**: Repository interfaces (ports) defined in core, implemented by infrastructure packages (adapters).

---

## Setup

### Prerequisites

- Node.js 22+
- pnpm 9+

### Installation

From the monorepo root:

```bash
pnpm install
```

### Environment Variables

**None required**. This package has zero infrastructure dependencies and runs in any JavaScript environment.

### Local Development

```bash
# Build the package
pnpm --filter @homethrive/core build

# Run unit tests (with mocked repositories)
pnpm --filter @homethrive/core test

# Run tests in watch mode
pnpm --filter @homethrive/core test:watch

# Generate coverage report
pnpm --filter @homethrive/core test:coverage
```

---

## Usage Guide

### Package Architecture

```
packages/core/
├── src/
│   ├── domains/
│   │   ├── care-recipients/
│   │   │   ├── entity.ts          # TypeScript interfaces
│   │   │   ├── schema.ts          # Zod validation schemas
│   │   │   ├── service.ts         # Business logic
│   │   │   ├── repository.ts      # Port interface (abstract)
│   │   │   ├── errors.ts          # Domain-specific errors
│   │   │   └── __tests__/         # Unit tests
│   │   ├── medications/
│   │   ├── schedules/
│   │   └── doses/
│   │       ├── dose-occurrence.entity.ts
│   │       ├── dose-taken.entity.ts
│   │       ├── dose-id.ts         # Opaque dose ID encoding
│   │       ├── recurrence.ts      # Dose generation logic
│   │       └── service.ts
│   ├── shared/
│   │   ├── errors.ts              # Base error hierarchy
│   │   ├── time-utils.ts          # Luxon timezone helpers
│   │   └── types.ts               # Common types
│   └── __mocks__/
│       └── mock-repositories.ts   # In-memory test implementations
└── index.ts                       # Barrel export
```

## API Design

### Service Pattern (Functional Factory)

Services use functional factories with dependency injection via closures:

```typescript
// Definition
export function createMedicationService(repo: MedicationRepository) {
  async function create(
    userId: UserId,
    recipientId: string,
    medicationInput: CreateMedicationInput,
    schedules: CreateScheduleForMedicationInput[]
  ): Promise<Medication> {
    // Validate: must have ≥1 schedule
    if (!schedules || schedules.length === 0) {
      throw new MedicationRequiresScheduleError();
    }

    // Atomic creation via repository
    const result = await repo.createWithSchedules(userId, recipientId, medicationInput, schedules);
    return result.medication;
  }

  async function getById(userId: UserId, medicationId: string): Promise<Medication> {
    const medication = await repo.findById(userId, medicationId);
    if (!medication) {
      throw new MedicationNotFoundError(medicationId);
    }
    return medication;
  }

  return { create, getById, /* ... other methods */ };
}

// Usage in API layer
const medicationService = createMedicationService(medicationRepository);

const newMedication = await medicationService.create(
  userId,
  recipientId,
  { name: "Aspirin", instructions: "Take with food" },
  [{ recurrence: "daily", timeOfDay: "09:00", startDate: "2024-12-01" }]
);
```

**Why functional factories?**
- No classes, no `this` context
- Explicit dependencies (easier to test)
- Immutable after creation
- Smaller bundle size

### Validation Pattern (Zod)

Zod schemas are the single source of truth for both runtime validation and TypeScript types:

```typescript
// schema.ts
export const createMedicationInputSchema = z.object({
  name: z.string().min(1).max(100),
  instructions: z.string().max(500).nullable().optional(),
});

export type CreateMedicationInput = z.infer<typeof createMedicationInputSchema>;

// Usage in service
function create(recipientId: string, rawInput: unknown) {
  const input = createMedicationInputSchema.parse(rawInput);  // Throws if invalid
  // ...
}
```

### Error Handling

Domain errors extend base error classes for HTTP mapping in API layer:

```typescript
// Base errors (shared/errors.ts)
export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details: DomainErrorDetails | undefined;

  constructor(message: string, code: DomainErrorCode, details?: DomainErrorDetails) {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, identifier: string) {
    super(`${resource} ${identifier} not found`, 'NOT_FOUND', { resource, identifier });
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, code = 'CONFLICT', details?: DomainErrorDetails) {
    super(message, code, details);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, code = 'VALIDATION_ERROR', details?: DomainErrorDetails) {
    super(message, code, details);
  }
}

// Domain-specific errors (medications/errors.ts)
export class MedicationNotFoundError extends NotFoundError {
  constructor(medicationId: string) {
    super('Medication', medicationId);
  }
}

export class MedicationRequiresScheduleError extends ValidationError {
  constructor() {
    super('Medication must have at least one schedule');
  }
}

export class InactiveMedicationError extends ConflictError {
  constructor(medicationId: string) {
    super(`Cannot modify inactive medication ${medicationId}`);
  }
}

// Type guards for API layer
export function isMedicationNotFound(err: Error): err is MedicationNotFoundError {
  return err instanceof MedicationNotFoundError;
}
```

**HTTP Mapping (in API layer):**
```typescript
try {
  await medicationService.create(/* ... */);
} catch (error) {
  if (error instanceof NotFoundError) {
    return reply.status(404).send({ error: error.message });
  }
  if (error instanceof ConflictError) {
    return reply.status(409).send({ error: error.message });
  }
  if (error instanceof ValidationError) {
    return reply.status(400).send({ error: error.message });
  }
  throw error;  // 500 for unexpected errors
}
```

### Repository Pattern (Ports)

Repository interfaces define abstract contracts implemented by infrastructure:

```typescript
// repository.ts (port)
export interface MedicationRepository {
  findById(userId: UserId, medicationId: string): Promise<Medication | null>;

  listByRecipient(
    userId: UserId,
    recipientId: string,
    options?: { includeInactive?: boolean }
  ): Promise<Medication[]>;

  create(userId: UserId, recipientId: string, input: CreateMedicationInput): Promise<Medication>;

  update(userId: UserId, medicationId: string, input: UpdateMedicationInput): Promise<Medication | null>;

  setInactive(userId: UserId, medicationId: string, inactiveAt: Date): Promise<Medication | null>;

  // Atomic creation with schedules (enforces ≥1 schedule invariant)
  createWithSchedules(
    userId: UserId,
    recipientId: string,
    medicationInput: CreateMedicationInput,
    schedulesInput: CreateScheduleForMedicationInput[]
  ): Promise<{ medication: Medication; schedules: MedicationSchedule[] }>;
}

// Implementation in @homethrive/db (adapter)
export class DrizzleMedicationRepository implements MedicationRepository {
  constructor(private db: DbClient) {}

  async createWithSchedules(userId, recipientId, medicationInput, schedulesInput) {
    // Drizzle implementation with transaction
  }
  // ...
}
```

---

## Integration with Other Packages

### Used By: `@homethrive/db`

The `db` package implements repository interfaces defined in core:

```typescript
import { MedicationRepository } from '@homethrive/core';
import { db } from './connection';

export class DrizzleMedicationRepository implements MedicationRepository {
  // Concrete implementation using Drizzle ORM
}
```

### Used By: `apps/api`

The API layer uses core services with injected repositories:

```typescript
import { createMedicationService } from '@homethrive/core';
import { DrizzleMedicationRepository } from '@homethrive/db';

const medicationRepo = new DrizzleMedicationRepository(db);
const medicationService = createMedicationService(medicationRepo);

// Fastify route handler
app.post('/medications', async (request, reply) => {
  const userId = request.auth.userId;
  const medication = await medicationService.create(userId, /* ... */);
  return medication;
});
```

### Used By: Tests

Tests use in-memory mock repositories:

```typescript
import { createMedicationService } from '@homethrive/core';
import { createMockMedicationRepository } from '@homethrive/core/mocks';

describe('MedicationService', () => {
  it('enforces minimum schedule requirement', async () => {
    const mockRepo = createMockMedicationRepository();
    const service = createMedicationService(mockRepo);

    await expect(
      service.create('user-1', 'recipient-1', { name: 'Aspirin' }, [])  // No schedules!
    ).rejects.toThrow(MedicationRequiresScheduleError);
  });
});
```

---

## Testing

### Unit Tests

Unit tests use mocked repositories for fast, isolated testing:

```bash
pnpm --filter @homethrive/core test
```