
# ADR-002 - Dose Modeling Strategy
_Computed dose occurrences + persisted taken events vs materialized dose table_

## Context

The app must show upcoming medication doses and let caregivers mark a dose as taken.

Key requirements and constraints:

- Schedules support daily and weekly recurrence
- Each medication must have at least one schedule
- Medications are not deleted (they can be inactivated)
- Marking a dose as taken must be idempotent (no duplicates)

We need to decide how to represent “doses” in our db and API. The question is:

- Should we store dose occurrences as rows in the database?
- Or should we compute upcoming occurrences from schedule rules and only persist taken state?

This decision impacts schema design, API contracts, idempotency and handling of schedule edits + timezones.

## Decision

We will model doses as computed/virtual occurrences generated from recurrence schedules within a requested time window and we'll persist adherence via a `dose_taken` table keyed by schedule id and a scheduled timestamp (UTC).

To allow the client to reference a specific occurrence, we will use:

- A stable DoseKey (scheduleId + scheduledForUTC)
- A `doseId` derived deterministically from the DoseKey (versioned with a `v1:` prefix)

In practice, this means we do not store every future dose in the database. We compute upcoming dose times from the schedule rules when we need to show them and we only store a record when someone marks a specific occurrence as taken. The `doseId` is the handle the UI/API uses to talk about a specific scheduled occurrence.

Here's how this should work:

1. A caregiver creates a medication and one or more schedules (the schedule rules are saved)
2. When the caregiver opens “Upcoming doses”, the app generates upcoming occurrences from the schedule rules for a time window
3. The app fetches taken records in the same window and merges them so each occurrence shows “taken” or “not taken”
4. When the caregiver clicks “Mark taken” on an occurrence, the client sends the `doseId` for that occurrence
5. The API decodes the `doseId` to the DoseKey and writes a `dose_taken` record (idempotent via uniqueness)
6. The UI refreshes the list and the occurrence now shows as taken

## Alternatives Considered

### Option A: Computed occurrences + persisted taken events (chosen)

- **Pros**
  - Minimal storage and no background job to maintain future dose rows
  - Schedule edits naturally affect future occurrences without rewriting stored dose rows
  - Recurrence logic stays centralized and unit-testable in `packages/core`
  - Idempotent “mark taken” is straightforward with a uniqueness constraint on DoseKey
- **Cons**
  - Requires a stable dose identity scheme (DoseKey / doseId must not change casually)
  - Listing doses requires generating occurrences and joining taken records
  - DST/timezone policies must be explicit to avoid surprising scheduled times

### Option B: Materialize future doses in a `doses` table

- **Pros**
  - Very simple “upcoming doses” query (read directly from `doses`)
  - Explicit per-occurrence rows can simplify reminders and reporting
- **Cons**
  - Requires a job to maintain a rolling window of future doses
  - Schedule edits/inactivation require rewriting or reconciling many rows
  - More schema, migrations, and failure modes than we want for v1

### Option C: Hybrid (materialize near-term, compute beyond)

- **Pros**
  - Can make the near-term UX fast and keep long-range logic flexible
- **Cons**
  - Still needs a maintenance job and complex “edit reconciliation” logic
  - Extra complexity not justified for the MVP scope

### Option D: Store only “last taken” per schedule

- **Pros**
  - Smallest storage footprint and simplest writes
- **Cons**
  - Cannot represent taken status per occurrence (breaks the UI requirement)
  - Weekly recurrence becomes ambiguous for “which dose was taken”

## Rationale

### Why compute occurrences and only persist taken events?

1. Correctness and idempotency are easier to prove with a stable DoseKey and a unique constraint.
2. It avoids background jobs and backfills, which keeps the MVP smaller and easier to ship
3. It makes schedule edits simpler. The source of truth is then the schedule rules, not thousands of derived rows.

### Notes

- Version `doseId` with a `v1:` prefix so we can change encoding later if needed
- Keep default windows small (7 days) and require explicit `from/to` from our UI

## Consequences

- **Positive**
  - Small DB footprint (schedules + taken events)
  - Easier schedule updates and medication inactivation
  - Strong idempotency guarantees for “mark taken”
  - Domain logic stays cleanly isolated and testable

- **Negative**
  - More work at read time (generate occurrences + join taken)
  - Requires clear timezone/DST policy and stable identity conventions

## Edge cases (timezones and DST)

This model depends on turning local schedule intent into concrete UTC timestamps at dose-generation time. The tricky parts are:

1. **Spring forward (missing local times)** - Some local times do not exist on daylight savings day so we need a policy for what time the dose should occur when this happens twice a year
2. **Fall back (repeated local times)** — Some local times happen twice; we must choose which occurrence to use so the app does not produce duplicate or surprising doses.
3. **Caregiver vs recipient timezone** — Dose generation and display must use the recipient’s effective timezone (schedule override or recipient default), not the caregiver’s device timezone.
4. **Timezone changes over time** — If a recipient or schedule timezone changes, future computed occurrences shift; the system should remain predictable about what changes and what does not.

Reference [ADR-005](ADR-005-timezones.md) for more on how this works.


