# Action-driven seasonal effects

The calendar makes an action **due**, not done. The shared scheduler owns the
occurrence, its physical effect and a fallback deadline. There is no inventory.
This replaces the earlier calendar-first, late-inspection behavior.

## State and checkpoints

Each occurrence retains its stable ID. Presentation status is pending,
presenting, interrupted, completed, expired or superseded. Independently, an
optional `effect` records `source: pip | fallback` and `appliedAt` (absolute ms).
An absent effect means unapplied. A successfully presented animation is still
distinguished from offscreen work: fallback uses **superseded**, not completed,
and creates no story memory or dream.

`holiday-effects.js` declares effects and projects records plus the active pose
onto calendar eligibility. Candle ignition happens at **18 seconds**, while
Pip holds the wick. Ornaments, the star and gifts reach their installed position
at **48 seconds**, then Pip straightens, releases and returns. The renderer uses
the same original mesh/instance throughout. Projection exposes contact in that
frame; `afterRender()` commits the effect before any final completion. Pip owns
the full visible exit even after that save.

Closing before contact leaves an interrupted, retryable installation. Closing
after contact retains the result and retires the unshown remainder of the exit;
it never collects or installs that object again. This intentionally avoids a
second resume choreography. A normal uninterrupted scene completes only after
the existing 32/82-second presentation has ended.

The companion key stays `little-space-station:event-schedule:v1`; its payload is
now **version 2**, accepting version 1. Previously completed v1 calendar-owned
activities retain their historical presentation status and scenery, credited
as legacy offscreen/fallback effects, never reclassified as witnessed Pip work.
Pending v1 actions gain the new rules. Narrative v5 and its v2–v4 migrations are
unchanged. Writes are transition-only and read back; denial leaves coherent
in-session state, but cannot guarantee cross-launch persistence before fallback.

## Local deadlines and prerequisites

All boundaries below are **local 00:00**, built with `LocalDate` and
`AddLocalDays`, not fixed 24-hour calendar arithmetic. The table describes the
inaugural 2026 activities; the existing deck is not rebuilt annually.

| Action / background work | Due | Offscreen fallback / dependency boundary |
| --- | --- | --- |
| First blue candle | Nov 29 | Dec 6, before the second Sunday |
| Second blue candle | Dec 6 | Dec 13, before the third Sunday |
| Rose candle | Dec 13 | Dec 20, before the fourth Sunday |
| Fourth blue candle | Dec 20 | Dec 24, before Christmas Eve |
| Authored ornaments 8 and 16 (zero-based) | Dec 15 / 17 | Dec 24, end of Dec 23 |
| Gold star | Dec 22 | Dec 24, end of Dec 23 |
| Blue long parcel | Nov 30 | Dec 1 |
| Ivory square box | Dec 7 | Dec 8 |
| Copper tall box | Dec 13 | Dec 14 |
| Muted red parcel | Dec 20 | Dec 21 |
| Gold small box | Dec 23 | Dec 24, end of Dec 23 |
| Background tree assembly | Nov 29 | Reconstructs assembled Nov 29, before Dec 6 strand work |
| Background strand installation | Dec 6 / 8 / 10 | Reconstructs on those dates, before the next string / Dec 13 ornaments |

Pip's existing section action seats/checks an already assembled lower bough;
his strand actions deliberately correct crooked existing loops. Neither has a
credible whole-tree/whole-string transport sequence. They remain independent
maintenance, labeled as checks/straightening, rather than pretending to install
those assemblies. Background work is thus already ready at each dependency
boundary. The other 24 ornaments remain gradual calendar scenery. No new
assembly choreography or generalized inventory is introduced.

Effects require the Commons Deck to be ready. The completed-tree admiration
also requires actual effective completion, not just a calendar count. All five
gift identities/positions/wrapping and all 26 ornaments are preserved.

Early gifts receive their whole placement day before fallback; the last gift,
star and authored ornaments have all of December 23. By the boundary ending
December 23 everything is installed even after a long absence. A Monday launch
can still show a normal unlit-candle lighting. Starting after a deadline applies
the result immediately and queues no redundant installation.

## Deadline conflicts and removal

Admission requires enough time to reach the physical checkpoint before its
deadline and enough time to finish the whole scene before scenery removal.
Otherwise it waits for fallback without beginning a doomed pickup. A running
scene retains sole prop ownership, including when its return extends beyond
the fallback time; fallback does not steal an actively manipulated object.
Normal admitted scenes therefore reach their checkpoint before the deadline.
A discontinuous clock jump past the deadline cancels the temporary pose and
reconstructs offscreen work. January 6 (or configured earlier deck removal)
retires active work before rendering; no actor or prop floats over a removed
deck. Commons Deck construction/dismantling itself remains unchanged background
calendar work.

The separate white Christ candle remains automatic Christmas Eve scenery:
there is still no authored ceremony responsible for lighting it.

## Removed misleading behavior

- No late ceremony observing a candle that fallback already lit.
- No missed-star fitting check or placed-gift inspection substituted for an
  obsolete installation. Normal final-tree admiration is retained.
- No unused absolute-window Advent directors or late-tending preview selector.
- Autumn/Halloween generic install/remove routines, carried replacement shape
  and temporary target hiding are removed. The carried item did not match the
  specific fixture, so wiring it to persistence would disguise a broken transfer.
  Calendar decorations, cleanup presets, cargo deliveries, all four oddities,
  Phantom Visitor and remembrance stories remain.

## Preview and diagnostics

**Inspect → Shared event scheduler** uses the same arbiter with isolated,
read-only records. Scenarios cover Monday's unlit candle, fallback retirement,
a pending star, interrupted post-attachment exit, gift placement/fallback,
late-season completion and January cleanup. Diagnostics distinguish pending,
physical source, presentation status, exact local deadline / absolute timestamp,
and retirement reason. **Simulate scheduler restart** retains only experiment
records. No preview writes production history.

**Scenes → Pip Activities** plays the original candle/decorating timelines with
beat selection and deterministic scrubbing. Forced scenes establish earlier
prerequisites but exclude their own target until contact. Calendar-only date
inspection assumes no witnessed actions: pending targets remain absent until
their fallback. Backward seeks project saved effects only at/after their
recorded timestamp, without deleting any saved record.
Production retains already-applied effects across backwards clock corrections
while their seasonal scenery is eligible; only read-only historical inspection
projects the earlier timestamp.

To add an action-driven event, register it with `ScheduledEvents.catalog()` and
declare a stable ID, local due date, `effect: {kind,index,at,deadline}`, resources,
availability and physical removal boundary. Extend the pure effect projection
and use one actual prop through transport and attachment. Save only after the
rendered checkpoint, never at selection. Test due/contact/deadline, restart on
both sides of contact, idempotence, read-only seeking and all required 3D views.

## Implementation verification

- Full suite: **190 tests passing** in UTC, America/Chicago and Pacific/Auckland.
  Includes physical mesh/instance ownership, saved effect versus completed
  animation, interruption, deadlines, denied storage, v1 companion migration,
  existing narrative v2–v5 migrations, local/DST arithmetic and older stories.
- Dedicated Chrome Flatpak, 1280×800: all four complete 32-second ceremonies
  played at **1×**. Full 82-second star, ornament and parcel activities played
  at **3×**. Contact boundaries were sampled at 17.95/18.05 and 47.95/48.05,
  plus release. All five gifts and both authored ornaments were exercised.
- Rendered captures cover production perspective, Top, Front, Side and Back
  (Front hides much of the aft deck). Reviewed setup, pickup, attachment,
  release, reaction and return, including explicit daylight/deep-shadow samples.
  Actual rendered matrices matched after forward/backward seeks. The corrected
  wick diagnostic now reads the rendered effect rather than raw calendar week.
- Isolated scheduler scenarios exercised pending/unlit Monday, deadline
  retirement, interrupted installed star, gift handoffs, late-season completion
  and January removal. Preview storage remained unchanged; no page errors or
  failed application resources occurred.
- An isolated **unmarked production URL** performed real candle contact,
  restarted before ignition (still unlit/retryable), restarted after ignition
  (lit, exit retired, no duplicate installation), and reconstructed the complete
  Christmas Eve arrangement. No preview controls or application input/fullscreen
  listeners were registered. Its initial test-clock fixture incorrectly reset
  time on reload; this harness issue was corrected before the successful run.

Artifacts and scripts are `/tmp/effects-*` and `/tmp/review-effects*.mjs`.
Test tabs are closed; the localhost preview server and dedicated test browser
remain available. No Git changes were committed or pushed. Steam Gaming Mode
compatibility, dismissal and performance remain separately unverified.
