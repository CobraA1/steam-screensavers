# Room for One More · Thanksgiving 2026 and Advent

## Presentation

The 112-second story is about hospitality, not a repair or mystery:

| Time | Beat |
| --- | --- |
| 0–18 s | Pip travels over the cabin/rails, descends onto the open deck, and adjusts the warm table lantern. |
| 18–32 s | A returning construction rigger arrives; Pip turns and welcomes it. |
| 32–44 s | The familiar inspection drone cautiously peeks over the back of the cabin. |
| 44–56 s | Pip notices and gestures an invitation; the drone clears the roof before approaching. |
| 56–74 s | Pip shuffles sideways, tries the cramped third tray, pauses, then extends it and releases the handle. |
| 74–94 s | All three turn toward the planet for a long, quiet shared view. |
| 94–112 s | The construction drone leaves first, the inspection drone follows, and Pip waves and returns home. |

The deck remains **4 × 3.1 units**. Its floor, supports, rails, cabin, attachments,
assembly, dismantling, and docking corridor are unchanged. The table occupies
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

`holiday-calendar.js` supplies pure UTC calculations: fourth Thursday of
November, and the fourth Sunday before Christmas. Tests cover 2026–2125,
including both 3-day and 10-day gaps and a fourth Sunday on Christmas Eve.

Preparation starts five days before Thanksgiving. The story is eligible only
November 26–28, 2026. Calendar decorations are independent of whether the
story was ever presented. The reusable presentation window ends at Advent,
not a fixed November date. The existing installed-deck lifecycle is still the
inaugural 2026/January 2027 lifecycle, not a new annual construction system.

On Advent's first morning the harvest tray retracts and the table is repurposed
for a low blue-and-gold four-light arrangement. This is a six-hour,
calendar-reconstructed scenery transition, **not a second persisted story**.
Pip does not perform a separate Advent installation task in this version.
Fall details diminish over the first week. Lights increase on each calculated
Sunday: November 29, December 6, 13, and 20 in 2026. At Christmas all four glow
with a small warm cross-shaped star finial. No Christmas visit/story or dream
is implemented. The decoration clears with the new year; January deck
dismantling remains unchanged.

## Scheduling, persistence, and compatibility

- Production needs 12 seconds of safe quiet, an assembled deck, at least 127
  seconds before traffic, no forced scenario, no dream, and no unfinished
  antenna/Halloween/All Saints' story.
- The existing v5 seasonal slot gains one recognized type and a Thanksgiving-only
  `expired` lifecycle. This is an additive extension, not a new record shape or
  storage key. Existing v2–v4 migration remains in place and is regression-tested.
  Unfinished older incidents cannot be overwritten; completed memories survive.
- Checkpoints are preparations, invitation, together, and final return. Resume
  waits for a safe quiet window and starts the saved chapter, not an arbitrary
  frame. Completion is monotonic and idempotent, and archives a non-dream-eligible
  memory in the existing bounded 12-entry list.
- A running gathering finishes across the Advent boundary. A subsequent launch
  after that boundary retires an interrupted Thanksgiving as `expired`, without
  replay or a fabricated memory. Earlier clock jumps do not expire it.
- Storage failure falls back to in-memory progress and never stops rendering.
  As with other stories, once-per-year cannot be guaranteed across restarts when
  storage is unavailable or evicted.

## Preview

Open **Thanksgiving & Advent** in the existing preview console:

- **Play gathering**, beat selection, and the 0–112-second scrubber.
- Preparations, gathering decorations, Advent transition, each Advent Sunday,
  and Christmas handoff.
- 2026 (3-day gap) and 2028 (10-day gap) date buttons. Future-year tests temporarily
  assemble the deck solely for previewing the reusable calendar rules.
- **Natural calendar** clears these overrides and returns to actual world time.

These controls never write narrative checkpoints. Other story/cargo previews
take precedence when selected. Production never imports this preview module or
registers its input listeners.

## Verification

Run `npm test`. Holiday tests exercise date boundaries, backward seeking,
actual model transforms, hand-to-prop contact, roof clearance, all beat
boundaries, migration/slot protection, storage failure, expiry, completion
idempotence, midnight continuation, and four independent Advent lights.

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

Remaining host validation: Gaming Mode performance and dismissal on the Deck.
The Advent installation is scenery reconstruction rather than a separate Pip
activity. A Thanksgiving dream and full Christmas story are deliberately deferred.
