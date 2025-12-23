# ADR-001 - Database Choice
_Postgres on RDS vs DynamoDB_

## Context

We need a database for the our api that supports:

- Persisting medications, schedules and dose taken events
- Enforcing business rules:
  - A medication must be created with at least one schedule
  - Medications are not deleted (they are inactivated)
  - Marking a dose as taken must be idempotent (no duplicates)
- Querying efficiently for the main user workflow:
  - Generate virtual occurances for upcoming doses (computed from recurrence rules in a time window)
  - Merge / join those virtual occurrences with persisted `dose_taken` rows

## Decision

We will use Postgres on AWS RDS as the primary datastore and interact with it via Drizzle ORM.

## Alternatives Considered

### Option A: Postgres on RDS

- **Pros**
  - Transactional writes make it easy to create a medication and its schedules atomically
  - Natural relational modeling (medications -> schedules, schedules -> dose_taken)
  - Strong constraints (foreign keys/uniques) for correctness and idempotent “taken” events
  - Flexible querying for upcoming doses views and admin/debugging
- **Cons**
  - Lambda to RDS connection management needs connectino pooling
  - Slightly more operational overhead than a fully serverless NoSQL option

### Option B: DynamoDB

- **Pros**
  - Great fit for serverless Lambda and simpler scaling
  - No connection pooling concerns; predictable performance under high load
  - Potentially simpler infrastructure footprint for small apps
- **Cons**
  - Upcoming doses becomes more application-driven:
    - More index design work and item-shape trade-offs
    - More code to model access patterns and enforce business logic
  - Harder to express relational integrity and uniqueness constraints without extra logic

## Rationale

1. **Correctness-first constraints**
   - This domain benefits from relational constraints and transactions:
     - “Medication must have at least 1 schedule” is easiest to enforce with a transactional write
     - Idempotency is easily handled by a uniqueness constraint on scheduleId and scheduledForUTC

2. **Query ergonomics for the primary UX**
   - Even though upcoming doses are computed, we still need to reliably persist and query taken events and we want straightforward ways to inspect or debug cross-entity state during development.

3. **Extensibility**
    - Straightforward and controlled evolution as requirements expand (more entities, analytics, reporting, etc). Schemas and migrations are easier to scale when dealing with more complex use-cases where a more complicated domain layer may change over time. Strong consistency and constraints for core logic + idempotency would be highly beneficial in the long-term.

### Notes on Scaling RDS with Lambdas

We will need to use RDS Proxy (or some other connection pooling mechanism) and keep connections bounded/multiplexed to avoid exhausting database connections during high traffic times


