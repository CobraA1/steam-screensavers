# Advent wreath ceremonies — Phase 2B

Implemented November 21, 2026. Four optional, peaceful 32-second activities use
the existing wreath, five candles, Pip model and fixed-length wrist-tool reach.
They create no story record, inventory, dream or new simulation.

## Calendar and witnessed ignition

The calendar remains authoritative. The original Sunday dates and Christmas Eve
Christ-candle rule are unchanged. As agreed for this phase, wreath preparation
now takes place during the six hours **before** the first Advent Sunday, rather
than the six hours afterwards: November 28, 18:00–24:00 UTC in 2026. The harvest
settings retract and the existing unlit wreath rises in the same table position.
An active Thanksgiving story retains its harvest setting until its exit.

| Sunday, 00:00 UTC | Candle | Weekly character |
| --- | --- | --- |
| November 29 | First blue | Careful examination of the newly prepared wreath, then quiet admiration |
| December 6 | Second blue | Straighten a front evergreen sprig before approaching the wick |
| December 13 | Rose | A small pleased nod and head tilt |
| December 20 | Final blue | Watch all four flames in a long, peaceful pause |

Every ceremony starts 18 seconds before midnight and ends 14 seconds afterwards.
The wrist tool reaches the wick by second 17 and holds through second 19.
At **second 18 / Sunday 00:00 UTC**, the real `HolidayCalendar` count increases;
the renderer shows the flame immediately. A small, warm settling pulse follows
contact. Earlier candles remain lit, and the white central candle is untouched.

There is no visual override that turns a calendar-lit candle off. Missing every
ceremony, reopening afterwards, interrupting one, or jumping dates still gives
the correct accumulated flames. A restart within the 32-second window starts at
its absolute current pose; after midnight it shows observation/withdrawal rather
than a second ignition. Preview seeks deliberately move the preview calendar
alongside the pose, so before/after samples exercise the same flame rules.

## Choreography and access

The shared beats are notice (2 s), approach (8), tend (4), reach (3), light (2),
observe (5), and return (8). Pip flies along the established clear route over the
cabin and rail, turns toward the selected candle, and uses the existing wrist
tool. The two far candles are reached from their outside edges, avoiding the
near candles and taller white candle. After the second week's sprig adjustment,
Pip retracts, rises clear of the table, turns, and approaches the second wick.
He withdraws the tool before returning along the overhead route to his pad.

All body, arm, head, eye, sprig and flame transforms reconstruct on each update.
The arm links retain their original lengths. No table, wreath location, deck,
tree, gift or traffic-path geometry is enlarged or moved.

## Safe opportunities, priority and limits

The inaugural activities are **2026-only**, matching the existing seasonal deck
and Phase 2A activities. The wreath calendar remains reusable across years.
An absolute window must be free of traffic (including margins), ordinary
maintenance and recharge throughout. An absent/not-ready deck, forced scenario,
dream, active or unfinished story, or Phase 2A decorating activity excludes it.
Existing Phase 2A windows take priority on overlap. Unsafe or missed ceremonies
are omitted; they are never queued later and never delay the candle calendar.

The director retains only a bounded set of at most four interrupted IDs in
memory. A cancelled opportunity cannot restart later in that session. Already
active stories take priority; selection of a new discretionary story waits for
an ongoing ceremony's short exit. No storage availability is required.

For the default `little-station-001` seed, the first two windows are available;
the rose and fourth-candle windows overlap existing present placements and are
omitted. Their flames still light at midnight. Other seeds may also lose a
window to traffic, maintenance, recharge or a higher-priority story. All four
complete ceremonies are always available through explicit preview.

## Preview and verification

Choose **Scenes → Pip Activities → Wreath: Advent 1/2/3/4**. The Sunday selector
switches weeks; the beat selector, seconds slider, shared playback, restart and
step controls operate on the selected ceremony. Playback starts at normal speed
unless an existing speed override is selected. Seconds **17.95 / 18.05** show
the selected wick immediately before and after real calendar ignition. **Stop**
returns to calendar scenery at the current date; **World → Return to live
simulation** clears the temporary date and restores actual time. Neither saves
or clears narrative history.

Review production perspective at 1280×800 and top/front/side orthographic views;
use Back when the station hides the Commons Deck from Front. Inspect approach,
sprig contact, wick reach, 17.95/18.05, withdrawal, observation and the return.
Check both daylight and shadow. `tests/advent-wreath.test.js` checks candle
identity/colors, accumulating flames, calendar preparation and ignition,
Christmas Eve isolation, actual wrist contact, full-pose reverse reconstruction,
beat/waypoint continuity, mesh clearances, and interruption/safety exclusions.
The existing Thanksgiving, tree, decorating, persistence and dream tests remain
part of the full suite.

Review performed November 21, 2026:

- Full suite: **172 tests passing**. The six focused wreath tests also pass
  after the final arm-segment clearance checks.
- Played all four complete ceremonies at **1×** in the dedicated Chrome
  Flatpak, capturing the actual playback every two seconds. Repeated the first
  after moving its approach so Pip's body does not hide the flame.
- Inspected approach, sprig contact, reach, **17.95/18.05**, observation and exit
  at 1280×800 in production perspective, top/front/side orthographic views,
  and Back where Front obscures the Commons Deck. Included daylight and deep
  shadow. Reverse seeks restore identical rendered matrices and visibility.
- In an isolated browser context with a test clock, the **unmarked production
  URL** ran the natural second-Sunday ceremony across midnight and exited;
  the third Sunday yielded to present placement. Christmas Eve showed all five
  candles, and January 6 removed the display. No preview controls, application
  input handlers or page errors were observed. Automation's own input
  interceptors were identified separately from application registrations.
- Forced playback, scrubbing and return-to-live left saved narrative data
  unchanged. No failed application resources occurred; the initial fresh
  browser request for `/favicon.ico` produced the known unrelated 404.

Captures are under `/tmp/wreath-live-*`, `/tmp/wreath-review-*` and
`/tmp/wreath-production-*`. The preview server and dedicated test browser remain
running on localhost 8765/9222. Desktop testing does not establish Steam Gaming
Mode compatibility, dismissal behavior or performance.

## Future work

The Christmas Eve Christ-candle ceremony and tree-lighting celebration remain
unimplemented. There is no approaching visitor, Christmas Day gathering, gift
opening, Christmas story persistence or new dream in this phase.
