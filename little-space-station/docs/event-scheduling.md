# Shared event scheduling

## Contract and ownership

`event-scheduler.js` is the shared production arbiter. `scheduled-events.js`
registers the existing antenna, Phantom Visitor, remembrance, Thanksgiving,
13 decorating activities and four wreath ceremonies. Event-specific timelines,
actors, chapter checkpoints and renderers remain in their original modules.
`app.js` asks for admission **before** `EventDirector` presents traffic or
maintenance, then applies the selected event and renders it. Payoff checkpoint
writes and final scheduler completion happen **after rendering**.

Descriptors have a stable occurrence ID, due/preferred absolute timestamp,
category/priority, duration, shared resources, availability prerequisites,
explicit physical retirement boundary/reason, and optional start, resume and
pose adapters. Absence of a record before its due date means **not yet due**.
Afterwards records distinguish pending, presenting/interrupted, completed and
explicitly expired/superseded. Selection is never completion.

## Priority and quiet time

| Order | Rule |
| --- | --- |
| First | A running significant event retains ownership through its visible exit. |
| P10 | Pending important holiday stories: Phantom, remembrance, Thanksgiving. |
| P20 | Calendar ceremonies and Advent decorating, in chronological due order. |
| P30 | Stubborn Antenna, preserving its existing single saved experience. |
| P40 | Ordinary spacecraft and maintenance; an admitted visit/work finishes. |
| P50 | Recharge, seasonal incidental activity and ambient behavior. An active recharge or admitted seasonal action finishes before a new significant event. |

Within a category, earliest due date wins; deferred status and stable ID break
ties. All Saints' Day suppresses a deferred playful Phantom presentation until
November 2 so the quiet observance keeps its tone. Every significant event
requires 12 seconds of quiet by default (`story.minimumSessionSeconds`, minimum
4). Completion grants **90 seconds of ambient/routine opportunity**, followed
by the next quiet lead-in. That break also survives an immediate restart.
Pending events do not start in an immediate back-to-back backlog. The inaugural
catalog is finite; queued routine traffic can enter during every break.

The antenna is now a dependable pending experience rather than a lucky random
opportunity: one seeded variant/occurrence is offered if there is no saved
antenna experience. Legacy `opportunityChance` and opportunity-window settings
no longer govern production selection. Historical director exports remain for
compatibility tests, not as alternative production scheduling paths.

## Traffic admission

`TrafficScheduler` still generates exactly the same absolute seeded visits.
`TrafficAdmission` sits above it. A ship already in progress when the viewer
arrives is admitted and completes normally. A reservation never removes a
visible, docking, docked or departing ship. An unadmitted arrival encountered
during a reservation waits offscreen in a FIFO. When released it begins its
**whole existing approach**, with all phase timestamps shifted equally.

Visit IDs, types, gesture seeds, service durations and cargo identities stay
unchanged. `originalVisitStartMs` also preserves its original seasonal manifest
date. Admission/defer decisions are explicit and visible in diagnostics. There
are no fabricated deliveries, changed traffic seeds, or extra routine visits.
The admission ledger is session-local: a relaunch or non-contiguous clock seek
reconstructs the original absolute traffic schedule, not a made-up completed
delivery. Given the same admission inputs the result is deterministic.

Maintenance that was already admitted finishes; a new maintenance slot cannot
consume a reserved gap. Recharge and incidental seasonal actions also yield
new admission, while their already-running presentations finish. No lighting,
planet rotation, fictional seasons, traffic generation or simulation clock
periods are converted to calendar days.

## Catch-up and calendar authority

All four wreath observances stay pending if a ship or decorating activity
conflicts, including the default seed's third/fourth Sundays. If quiet is
available in advance, the unchanged 32-second ceremony starts near 18 seconds
before **local** midnight and reaches the actual ignition boundary. Otherwise
it waits and observes the already-lit candle. It never extinguishes or relights
a calendar flame, and never affects the Christ candle.

Installations have their existing 82-second choreography and preferred
pre-midnight attachment. A missed synchronized approach waits for its scenery
boundary rather than carrying a supposedly installed object out of the tree.
Late ornaments are adjusted in place; an installed star is approached from
above for a fitting check. Already placed gifts use the existing quiet
inspection route, without collecting or duplicating them. Locker/prop ownership
and the five gift identities remain unchanged. Calendar decorations reconstruct
immediately even if no activity ever completes.

Retirement is explicit and inspectable, not a successful completion:

- Phantom and remembrance: November 4, when their autumn fixtures/decorations
  are packed away. A launch on November 2–3 can still catch up.
- Thanksgiving: six hours before the first Advent Sunday, when its harvest
  table begins being repurposed for the wreath. The original gathering is not
  replayed over an already-installed wreath.
- Advent actions/observances: January 6 scenery removal, or earlier if a longer
  configured dismantling makes the deck unavailable. No new event starts
  without enough time for its whole exit before removal.
- Antenna: no calendar expiry; its station equipment remains available.

An older unfinished narrative checkpoint is retained even when its scheduler
occurrence retires. No absent-season completion or dream is invented. These
holiday activities still belong to the inaugural 2026/2027 deck, not an annual
construction or generalized holiday-story framework.

## Local time and clock changes

`local-calendar.js` centralizes local date construction, `setDate`-based day
addition, calendar-day comparison and date input formatting. Human holidays,
tree milestones, candles, autumn transitions and January deck boundaries use
the browser/device's current zone. Calendar days may last 23 or 25 hours.
Absolute timestamps remain available for event ordering and debugging.

Preview inputs/presets show local wall time and the zone; Inspect also shows
milliseconds and ISO UTC. A zone change updates calendar scenery immediately
and rebuilds future event dates at the next idle scheduler zone check (at most
one minute of world time). A currently presenting event finishes its authored
choreography first. Stable occurrence IDs and completed history do not change
or replay. Absolute clock jumps do not advance authored event elapsed time;
only visible frame steps do. Reverse preview seeks never write history.

## Persistence and compatibility

`little-space-station:event-schedule:v1` is a small, separately namespaced,
seed-tagged companion record, bounded to 128 occurrences. It contains pending
and terminal states plus occurrence-specific narrative checkpoints, not an
inventory or a replacement memory system. Writes occur only on transitions
and milestones, never continuously per frame. A saved presenting occurrence
loads as interrupted; stories use their existing chapter resume, brief
calendar actions restart coherently as tending/inspection where needed.

Narrative v5 is deliberately unchanged. Its existing v2–v4 readers still
migrate memories, outcomes and checkpoints. The companion imports saved
completed stories as completed and unfinished incidents as interrupted; old
explicit Thanksgiving expiry stays expired. A saved payoff after a crash is
never reinterpreted as an unseen story needing another full replay. Normal
live playback retains ownership until the exit, even after saving its payoff.

`commitScheduledSeasonal` preserves any older unfinished legacy seasonal slot
while merging the new occurrence's actual completed memory/consequences.
Occurrence checkpoints live in the companion, so the single old seasonal slot
is not abused as a global queue. Local Storage access/read/write failures use
in-memory records and do not stop rendering. As before, unavailable/evicted
storage cannot guarantee once-only behavior across launches.

## Preview and future adapters

**Inspect → Shared event scheduler** shows active/pending IDs, priorities,
waiting reasons, estimated opportunity, completed/retired records, storage and
traffic decisions. The estimate is a lower bound, not a promise that a docked
ship has finished. Read-only scenarios demonstrate delayed Advent III,
docked-ship conflict, four-Sunday backlog, interrupted installed-star tending
and January retirement. **Simulate scheduler restart** retains only the
experiment's in-memory records. Any scene selection, Stop or Return to live
clears the experiment. No scenario modifies actual narrative or queue storage.
Normal preview is calendar/scene inspection rather than unattended production
scheduling; run a scenario to exercise the arbiter. Advanced saved-data controls
include a separately confirmation-gated scheduler-record reset. This does not
erase narrative memories, and refuses to erase another seed's records.

For a new event, add a descriptor in `ScheduledEvents.catalog()` using its own
timeline/factory/apply functions. Declare real prerequisites, a meaningful
retirement reason where required, a coherent resume checkpoint and shared
resources. Do not add another random safe-window director or commit on
selection. Add migration/identity, waiting/conflict, catch-up, interruption,
completion-after-render and reverse-preview tests. Changes to paths/contact
require perspective plus top/front/side visual review.

Run the whole suite in all supported calendar samples:

```sh
TZ=UTC npm test
TZ=America/Chicago npm test
TZ=Pacific/Auckland npm test
```

The scheduler tests include northern/southern DST, missed dates, deferred
routine traffic, all four default-seed observances, bounded spacing,
v2–v5 migration, storage failure, January retirement and read-only previews.
Existing dense geometry tests also exercise installed-prop tending variants.
Desktop Chrome playback does not establish Steam Gaming Mode verification.

## Verification of this implementation

- Full suite: **186/186 passing in each of UTC, America/Chicago and
  Pacific/Auckland**. Coverage includes the default seed's four observances,
  north/south DST day lengths and preview jumps, narrative v2–v5 migration,
  crash-window reconciliation, explicit retirement versus real completion,
  storage failures, traffic identity/admission, interruption and quiet spacing.
- Dedicated Chrome Flatpak at **1280×800**: all four complete wreath ceremonies
  played at **1×**; a complete delayed rose-candle observance also played at 1×
  with all three existing flames staying lit. An installed-star tending action
  completed at 3× after an isolated checkpoint restart.
- Complete Thanksgiving, Phantom Visitor, remembrance and ornament-installation
  playback at 4× used the actual renderer and controls, without page errors or
  failed application resources. An admitted survey visit completed service,
  departure and afterglow before the pending observance started in the conflict
  scenario (accelerated calendar playback). Preview storage stayed unchanged.
- Star, ornament and placed-parcel catch-up were inspected in production
  perspective, top/front/side orthographic and Back where Front hid the action.
  Captured approach, contact/adjustment, release/inspection and home return;
  dense geometry assertions check intermediate paths and every gift identity.
  Actual rendered matrix comparisons matched after reverse scrubbing.
- An isolated **unmarked production URL** played a complete natural late
  first-Sunday ceremony at 1×, saved its completion and retained it on reload.
  No preview controls, application input listeners or page errors were found.
  January cleanup/retirement and January 7 calendar removal were also exercised
  in preview. Screenshots and review scripts are under `/tmp/scheduler-*` and
  `/tmp/review-scheduler*.mjs`.

No production geometry or original installation/story choreography was
redesigned. Catch-up variants required a safe above-foliage star reach and
already-placed parcel inspection rather than duplicate handling. The local
preview server and dedicated test browser remain running; test tabs were
closed. Steam Gaming Mode dismissal, storage origin and performance still
require device-host checks.
