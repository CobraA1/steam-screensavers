# Advent wreath ceremonies — Phase 2B

Implemented November 21, 2026. Four optional, peaceful 32-second activities use
the existing wreath, five candles, Pip model and fixed-length wrist-tool reach.
They create no narrative memory, inventory, dream or new simulation. The shared
scheduler now stores occurrence status separately.

## Calendar and witnessed ignition

The calendar makes each outer candle due; contact or fallback lights it. The original Sunday dates and Christmas Eve
Christ-candle rule are unchanged. As agreed for this phase, wreath preparation
now takes place during the six hours **before** the first Advent Sunday, rather
than the six hours afterwards: November 28, 18:00–24:00 local time in 2026. The harvest
settings retract and the existing unlit wreath rises in the same table position.
An active Thanksgiving story retains its harvest setting until its exit.

| Sunday, 00:00 local time | Candle | Weekly character |
| --- | --- | --- |
| November 29 | First blue | Careful examination of the newly prepared wreath, then quiet admiration |
| December 6 | Second blue | Straighten a front evergreen sprig before approaching the wick |
| December 13 | Rose | A small pleased nod and head tilt |
| December 20 | Final blue | Watch all four flames in a long, peaceful pause |

The ceremony becomes due at its Sunday midnight. At a safe quiet opportunity,
Pip approaches an unlit wick; actual contact at **18 seconds** ignites it.
Monday catch-up performs the same genuine lighting action. Earlier candles
stay lit. See the [effect contract](action-driven-effects.md) for next-Sunday
fallbacks (fourth candle: Christmas Eve), saved ignition checkpoints, interrupted
exits and retirement without false completion. The white Christ candle stays
automatic calendar scenery.

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

## Shared scheduling and limits

The [shared scheduler](event-scheduling.md) replaces disposable windows. All
four inaugural 2026 ceremonies stay pending, including the default seed's third
and fourth Sundays. Current visits/work finish; future arrivals yield to a
reserved opportunity. Decorating and ceremonies share chronological ordering
and quiet breaks. Interrupted pre-contact scenes retry; a saved ignition retires
the remaining exit after restart, without extinguishing or relighting a candle.
Completion follows the full visible return. January scenery/deck removal
explicitly retires unpresented occurrences, without creating story memories.
Deadline fallback remains independent of storage. Preview is read-only.

## Preview and verification

Choose **Scenes → Pip Activities → Wreath: Advent 1/2/3/4**. The Sunday selector
switches weeks; the beat selector, seconds slider, shared playback, restart and
step controls operate on the selected ceremony. Playback starts at normal speed
unless an existing speed override is selected. Seconds **17.95 / 18.05** show
the selected wick immediately before and after actual contact ignition. **Stop**
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

## Future work

The Christmas Eve Christ-candle ceremony and tree-lighting celebration remain
unimplemented. There is no approaching visitor, Christmas Day gathering, gift
opening, Christmas story persistence or new dream in this phase.
