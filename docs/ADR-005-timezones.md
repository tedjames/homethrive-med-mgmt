# ADR-005 - Timezone Handling
_Handling timezones, reccuring doses and related edge cases_

## Context

The goal is to help caregivers schedule medications for care recipients. Schedules repeat daily or weekly at specific times (must take x medication at 9am every day)

We need a timezone and recurring dose tracking method that handles:

1. **Daylight Saving Time (DST)** — Clocks shift twice a year
2. **User intent** — 9am should always mean 9am, regardless of daylight savings scenarios
3. **Cross-timezone caregiving** — A caregiver in California may manage someone in New York
4. **Dose generation** — Computing specific UTC timestamps from recurring schedules

### The Core Problem

If we only store a schedule time as UTC (like `14:00:00Z` for 9am EST) - then after daylight savings transitions:

- Winter (EST) 14:00 UTC reminder becomes 9am
- Summer (EDT) 14:00 UTC reminder becomes 10am

The user said "9am" but after DST, they start seeing 10am. This is NOT okay for medication adherence.

## Decision

We will store scheduled times as local time + IANA timezone and convert to UTC at runtime / only when generating specific dose occurrences. For context, IANA stands for "Internet Assigned Numbers Authority" which is basically just a standard set of identifiers for timezones (America/New_York, Europe/London and Asia/Tokyo).
These identifiers:
- Encode historical and future DST rules
- Are used by libraries like Luxon and Moment.js
- Are more reliable than UTC offsets (like -05:00) because they encode DST transitions

### Data Model

- **`timeOfDay`** (`HH:mm` format; `"09:00"`) — User's intended local time
- **`timezone`** (IANA string; `"America/New_York"`) — Timezone for interpretation
- **`startDate`** (`YYYY-MM-DD` format; `"2024-12-20"`) — Local date (no timezone)
- **`scheduledFor`** (UTC timestamp; `2024-12-20T14:00:00Z`) — Computed occurrence

### Control Flow

1. User input: "Take medication at 9am"
2. Storage: timeOfDay = "09:00", timezone = "America/New_York"
3. Dose Generation (using Luxon):
  - December 20 (EST): 09:00 local -> 14:00 UTC
  - July 20 (EDT): 09:00 local -> 13:00 UTC
4. Database: scheduledFor = UTC timestamp

### Timezone Inheritance

To ensure accurate dose generation, we use a hierarchical lookup for the effective timezone:

1.  **Care Recipient Timezone (Default)**: Every care recipient has a primary timezone. Most medications follow this zone.
2.  **Schedule Timezone (Override)**: Individual medication schedules can optionally specify a different timezone - useful for someone temporarily visiting a different zone.

## Alternatives Considered

### Option A: Local time + timezone (Chosen)

- Description: Store `"09:00"` + "America/New_York"
- Pros: Matches user intent; DST-safe; industry standard
- Cons: Requires conversion logic

### Option B: Store as UTC

- Description: Store `14:00:00Z`
- Pros: Simple storage; no conversion
- Cons: Breaks on DST; user sees wrong time

### Option C: Store UTC offset

- Description: Store `"09:00-05:00"`
- Pros: Captures moment in time
- Cons: Offset doesn't encode DST rules; breaks on transitions

### Option D: Store both local and UTC

- Description: Store `"09:00"` AND `14:00:00Z`
- Pros: Redundant safety
- Cons: Data can drift; which is source of truth?

## Rationale

### 1. Why IANA Timezone Strings?

UTC offsets like `-05:00` don't encode DST transition rules. They're a snapshot - not a timezone. Luxon can resolve `America/New_York` to the correct offset for any date.

### 2. Why Local Dates for Start/End?

startDate and endDate are stored as `YYYY-MM-DD` strings, not timestamps, because:

1. "Start on December 20th" is a local concept — it means December 20th in the recipient's timezone
2. Postgres `date` type is timezone-agnostic, which is correct for local dates
3. Comparing local dates is simpler than comparing timestamps across timezones

### 3. Why Luxon?

JavaScript's Date object is not that great at handling timezones. Luxon provides:

- Proper IANA timezone support
- Immutable DateTime objects
- DST-aware date/time encoding

## Daylight Savings (DST) Edge Cases

Twice a year, daylight saving time creates edge cases where scheduled times behave strangely. Here's what happens and how we handle it...

### Spring Forward (missing hour scenario)

On the night DST starts (March), at 2am, clocks skip ahead to 3am. The hour from 2:00-2:59 is erased from that day.

```
Watching a clock that night:

1:58 AM
1:59 AM
3:00 AM  <- Clock jumps and we skip an hour
3:01 AM
```

**Problem:** If someone scheduled a medication at 2:30 AM, that time doesn't exist that night. The clock jumped over it.

**Our policy:** Round up to the next valid time (3:30 AM).


1. Schedule: timeOfDay = "02:30", timezone = "America/New_York"
2. March 10, 2024: 2:30 AM doesn't exist (clocks skip from 2am -> 3am)
3. Generated: 3:30 AM (7:30 UTC)

### Fall Back (repeated hour scenario)

On the night DST ends (November), at 2am, clocks jump back to 1am. The hour from 1:00-1:59 happens twice.

```
Watching a clock that night:

1:28 AM
1:29 AM
1:30 AM  <- First time
1:58 AM
1:59 AM
1:00 AM  <- Clock rewinds and we "relive" this hour
1:29 AM
1:30 AM  <- Second time 
1:59 AM
2:00 AM
```

**Problem:** If someone scheduled a medication at 1:30AM, which 1:30AM do we use? The first one (before the rewind) or the second one (after)?

**Our policy:** Use the earlier occurrence (first 1:30 AM).

1. Schedule: timeOfDay = "01:30", timezone = "America/New_York"
2. November 3, 2024: 1:30AM happens twice
3. Generated: First occurrence (5:30 UTC, not 6:30 UTC)

## Notes

- **Timezone changes** — If a recipient moves timezones, existing schedules with `timezone: null` will inherit the new timezone. Schedules with explicit timezones remain unchanged.
- **Display** — Frontend should display times in the recipient's timezone with clear labeling.
