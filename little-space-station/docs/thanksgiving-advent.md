# Room for One More · Thanksgiving 2026 and Advent

## Presentation

The 120-second story is about hospitality, not a repair or mystery:

| Time | Beat |
| --- | --- |
| 0–18 s | Pip travels over the cabin/rails, descends onto the open deck, and adjusts the warm table lantern. |
| 18–32 s | A returning construction rigger arrives; Pip turns and welcomes it. |
| 32–44 s | The familiar inspection drone cautiously peeks over the back of the cabin. |
| 44–56 s | Pip notices and gestures an invitation; the drone clears the roof before approaching. |
| 56–74 s | Pip shuffles sideways, tries the cramped third tray, pauses, then extends it and releases the handle. |
| 74–94 s | All three turn toward the planet for a long, quiet shared view. |
| 94–120 s | Pip turns to the construction drone and waves high with one hand before it leaves at 99 s, then turns and waves to the inspection drone before it leaves at 104 s. Pip returns home by 120 s. |

The deck is now **4.6 × 3.1 units** following the [Advent tree Phase 1](advent-tree-phase1.md)
aft extension. The gathering's table and actor anchors, cabin, attachments,
assembly/dismantling timing, and docking corridor retain their positions. The table occupies
the open front-left area, Pip stands behind it, and the guests hover on opposite
sides. Pip uses the existing articulated model with bounded two-joint hand
contact. Drone models are the actual shared assembly-rigger and Phantom Visitor
builders; there is no ghost cover, new physics, or required Halloween history.

`thanksgiving.js` reconstructs every actor channel from absolute story seconds.
`holiday-renderer.js` resets its complete pose on every update. The third tray
has an actual handle and extends rather than teleporting into place. Existing
deterministic cargo visits may bring labeled provisions during the preparation
window, without changing traffic frequency or requiring delivery completion.

## Calendar

`holiday-calendar.js` supplies pure local-calendar calculations: fourth Thursday of
November, and the fourth Sunday before Christmas. Tests cover 2026–2125,
including both 3-day and 10-day gaps and a fourth Sunday on Christmas Eve.

Preparation starts five days before Thanksgiving. The story is eligible only
November 26–28, 2026. Calendar decorations are independent of whether the
story was ever presented. The reusable presentation window ends at Advent,
not a fixed November date. The existing installed-deck lifecycle is still the
inaugural 2026/January 2027 lifecycle, not a new annual construction system.

During the six hours before Advent's first midnight the harvest tray retracts and the table is repurposed
for an evergreen Advent wreath with gold candle holders. This is a six-hour,
calendar-reconstructed scenery transition, **not a second persisted story**.
Pip does not perform a separate Advent installation task in this version.
Fall details diminish over the first week. Lights increase on each calculated
Sunday: November 29, December 6, 13, and 20 in 2026. Three outer candles are
blue; the third Sunday's candle is rose. A taller central white Christ candle
lights on Christmas Eve. All five remain lit through January 5, the twelfth day of Christmas; they
clear on January 6. Local midnight is the human calendar boundary. The existing
January deck dismantling still takes precedence over decorations.

This follows the evergreen ring, blue/rose candles and Christmas Christ candle
described in [LCMS: Lutheran Advent Traditions](https://resources.lcms.org/history/lutheran-advent-traditions/).
We use the Christmas Eve lighting convention, starting at December 24 local
midnight. This affects only the candle; the Christmas seasonal handoff remains
December 25.
The [Phase 2B weekly ceremonies](advent-wreath-phase2b.md) now bring Pip to each
outer wick at its Sunday midnight, when safe. Preparing the wreath before the
first boundary lets all four witnessed ignitions agree with the calendar.
No Christmas Eve Christ-candle choreography, Christmas visit/story or dream is implemented.

The [Phase 1 tree and wrapped presents](advent-tree-phase1.md) now occupy the
outer aft deck. Their calendar derives independently of story checkpoints;
decorations finish by December 23 and gifts stay wrapped through January 5.
This also adds tree-stage, gift-count, illumination and January cleanup previews.

## Scheduling, persistence, and compatibility

The [shared scheduler](event-scheduling.md) owns significant-event priorities,
catch-up and interruption. Thanksgiving stays pending while the harvest table
is available: November 26 through November 28 at 18:00 local time in 2026.
Current visits/work finish, while future routine visits can wait offscreen.
Significant events have a quiet lead-in and a 90-second ambient/routine break.
The table's Advent repurposing explicitly retires an unpresented gathering;
retirement creates no memory. Admission reserves the whole visible exit.

Existing chapter checkpoints, memories and v2–v5 migration stay intact. New
occurrence records use a separate bounded companion, not the single legacy
seasonal slot. Older unfinished incidents are never overwritten. Completion
follows the rendered payoff and exits finish. Storage failure remains nonfatal;
normal preview playback never writes history.

## Preview

Choose these entries in the preview console's **Scenes** tab:

- **Stories → Thanksgiving gathering** or **Thanksgiving farewells**, with beat selection and the 0–120-second scrubber.
- Preparations, gathering decorations, Advent transition, each Advent Sunday,
  Christmas Eve (five candles), Christmas Day (five), and the twelfth day.
- 2026 (3-day gap) and 2028 (10-day gap) date buttons. Future-year tests temporarily
  assemble the deck solely for previewing the reusable calendar rules. Find these under **Seasonal Scenes → Thanksgiving and Advent calendar**.
- **World → Return to live simulation** clears the overrides and returns to actual world time.

These controls never write narrative checkpoints. Other story/cargo previews
take precedence when selected. Production never imports this preview module or
registers its input listeners.

## Verification

Run `npm test`. Holiday tests exercise date boundaries, backward seeking,
actual model transforms, hand-to-prop contact, roof clearance, all beat
boundaries, migration/slot protection, storage failure, expiry, completion
idempotence, midnight continuation, four progressive Advent candles, and the
separate Christmas Eve–January 5 Christ candle.

Visual review uses the production 140% perspective plus top/front/side
orthographic views; inspect approach, lantern contact, peek, invitation, tray
contact, together, and departure. See [animation expectations](expectations/animation-expectations.md).
Desktop Chrome review does not establish Gaming Mode performance or host behavior.

### Implementation review (2026-10-21)

- Full suite: **143/143 passing**, including existing autumn, Halloween,
  remembrance, cargo/courier, dream, and assembly/removal tests.
- Dedicated Chrome Flatpak: complete normal-speed 112-second playback, sampled
  every ten seconds; deterministic scrub captures on both sides of every beat
  boundary; no page errors or failed application resources.
- 1280×800 production perspective plus top/front/side orthographic captures at
  8, 16, 41, 50, 66, 82, and 105 seconds. Inspected hand contact, the cabin route,
  table/actor separation, shared-view staging, and separate visual exits.
- Explicit daylight and deep shadow; preparations, transition, four Sundays,
  Christmas, and the 2028 ten-day-gap preview. Existing Phantom untangling,
  remembrance stillness, and cargo service were also smoke-reviewed.
- Unmarked production URL initialized without preview controls. Test services
  remain available on localhost 8765/9222; review captures are under
  `/tmp/holiday-*.jpg` and `/tmp/holiday-regression-*.jpg`.
- A pre-existing planet test used exact equality for differently scaled
  floating-point inputs. Only that comparison now uses a 1e-12 tolerance;
  identical-input determinism remains exact and planet runtime code is unchanged.

### Wave and wreath refinement review (2026-10-21)

- Full suite: **145/145 passing**, including raised single-arm poses, guest-facing
  farewell timing, reverse seeking, and candle boundaries across 100 years.
- The story now lasts 120 seconds, allowing each guest a turn-and-wave pause
  before departing. Preview includes **Play farewells** and explicit Christmas
  Eve, Christmas Day, and January 5 controls.
- Dedicated Chrome Flatpak played the full revised farewell (94–120 seconds)
  at normal speed without page errors. Playback frames and deterministic poses
  were reviewed in production perspective and top/front/side orthographic views.
- Reviewed the evergreen wreath, taller central candle, and progressive flames;
  the third Sunday lights the rose candle, while Christmas lights all five.
  Captures are under `/tmp/polish-*.jpg`.

Remaining host validation: Gaming Mode performance and dismissal on the Deck.
The Advent installation is scenery reconstruction rather than a separate Pip
activity. A Thanksgiving dream and full Christmas story are deliberately deferred.
