# Advent decorating — Phase 2A

Implemented November 3, 2026.

Pip now tends the existing tree and carries the existing wrapped gifts. These
are optional ordinary activities, not a new Christmas incident or inventory.
The [Phase 1 calendar](advent-tree-phase1.md) remains authoritative: missing
every animation still leaves a finished tree and five wrapped gifts by December
23. Neither calendar reconstruction nor these activities creates a completed
story or a dream.

## Actions and staging

- **Tree preparation:** Pip checks and reseats the lower modular bough section,
  then looks over the assembly. The November 29 evergreen is already assembled;
  this is a fitting check, not a second installation of the whole tree.
- **Garland/lights:** Pip reaches an existing strand, notices a crooked section,
  corrects it and checks the result. Each of the three strings has an opportunity.
- **Ornaments:** Two representative installations use existing ornaments 8 and
  16 (zero-based instance IDs). Pip collects, carries, attaches, straightens,
  releases and admires each one. The full 26-ornament calendar remains unchanged.
- **Star:** Pip collects the actual gold topper, lifts above the deck using his
  established hovering movement, and guides it onto the tree with his wrist
  maintenance clamp. Arms remain their original length; there is no new flight
  simulation, giant limb or teleporting replacement star.
- **Presents:** All five existing gift identities have individual opportunities
  and approach poses, with unchanged final positions and wrapping. The lid and
  bow remain part of each parcel; no Christmas Day opening is implemented.
- **Final inspection:** Pip approaches a clear viewing position without opening
  the supply locker, studies the completed arrangement, gives a small satisfied
  nod/visor expression, and returns to his charging pad.

A small hinged holiday supply locker sits beside the cabin at
`(-5.08, -0.43, 0.23)`. It conceals the staged prop until pickup. Pip reaches over
its lip; his pickup elbow arc unwinds gradually during travel. Each prop remains
the **same mesh/instance** from locker to wrist clamp to fixture. Installed
transforms, instance counts and visibility are reconstructed before every
activity pose, including backward seeks and cancellation. The reduced tool glow
keeps small ornaments readable. The locker is absent during Thanksgiving and
clears with the January tree removal. No floor, rail or cabin enlargement was
needed in this phase.

## Opportunities, UTC, inaugural 2026 season

Each activity lasts 82 seconds: notice 4, approach 14, collect 6, carry 14,
attach 10, straighten 8, release 4, inspect 8, return 14. Inspection uses those
same seek markers but has its own direct viewing route and no prop collection.

| Activity | Opportunity |
| --- | --- |
| Section fitting check | November 29, one seeded safe daytime slot |
| Strand adjustment | December 6, 8 and 10, one seeded safe daytime slot each |
| Ornament placement | Existing December 15 and 17 scenery boundaries |
| Gold star | Existing December 22 boundary |
| Five wrapped parcels | Existing November 30, December 7, 13, 20 and 23 boundaries |
| Completed-tree inspection | December 23, one seeded safe daytime slot |

Major placements begin **48 seconds before** their existing midnight scenery
boundary. Attachment finishes exactly at that boundary. Thus reopening later
never pretends that an already-installed star or parcel is still waiting for
its first installation. Daytime adjustments select one safe 15-minute slot
between 06:00 and 15:45 UTC. These are absolute opportunities, not session timers:
reopening inside one reconstructs its current pose, not its beginning.

Traffic, ordinary maintenance and recharge are checked across the whole window,
with traffic margins. Higher-priority stories, a pending unfinished story,
spacecraft visits and forced scenarios take precedence. An unsafe/missed window
is omitted rather than queued; an interrupted window cannot restart later in
that session. No new saved record, schema or completion write is needed.
The default seed currently has 12 safe opportunities out of 13: the final gold
parcel's midnight window is busy, so its calendar placement occurs without an
animation. This is intentional graceful fallback, not an unfinished present.

These optional activities are inaugural **2026** choreography, matching the
existing deck/story year. Scenery retains its reusable year calculations; this
does not add annual deck construction or a recurring Christmas narrative.

## Preview

Under **Scenes → Pip Activities → Advent decorating** select an activity,
gift, or strand/ornament variation. Use the shared playback controls, beat
selector, and seconds slider. Starting or seeking
reconstructs a temporary date and complete pose; preview never writes story
history. Other forced stories/events cancel decorating. **Stop** restores calendar
scenery. The holiday calendar selector covers intermediate states,
full warm illumination, Christmas Eve readiness and January cleanup.

Use the default 140% perspective at 1280×800 plus the camera shortcuts for top,
front and side orthographic views. The front view naturally hides some aft-deck
action behind the station; it is a clearance check, not a replacement staging
camera. See [animation expectations](expectations/animation-expectations.md).

## Verification

`tests/advent-activities.test.js` covers all 13 authored opportunities: beat and
route continuity, fixed-length reach, actual prop/contact transforms, pickup
over the locker rim, deterministic reverse seeks, original gift IDs/positions,
midnight visibility handoffs, missed/interrupted windows, traffic exclusion,
completed Christmas wrapping and January removal. Dense body/head/arm/tool vertex checks
cover the cabin, table, foliage, rail tops, floor and other wrapped parcels.
The existing holiday, live story, cargo, dream, persistence and deck lifecycle
tests remain applicable.

Review performed November 3, 2026:

- Full suite: **163 passing**, including seven new behavioral tests. Contact is
  sampled every quarter-second during carrying/attachment; geometry clearance
  checks include the visible arms/tool as well as Pip's body and head.
- Inspected setup, pickup, intermediate travel, attachment, straightening,
  release, reaction and return at 1280×800 in production perspective and all
  three orthographic views. Included all five parcels, three strands and both
  ornament placements. Compared 47.95/48.05, 55.95/56.05 and 59.95/60.05 seconds
  in all four views for every activity type.
- Played all six complete 82-second sequences through the actual preview at
  5× speed, then repeated affected sequences after refinement. Inspected
  normal-speed pickup (22–29 seconds) and attachment/release (46–62 seconds) for
  ornaments, the star and a wrapped parcel. Tests verify continuous transforms
  across every beat and authored waypoint, including reverse seeking.
- Exercised rendered seeks `52 → 82 → 24 → 0 → 52`. Decoration/Pip matrices
  reconstruct exactly; settled orthographic image comparisons differed by at
  most one color-channel step (no pixels changed by more than that).
- Checked Thanksgiving table staging, cancellation by a forced courier visit,
  Christmas Eve readiness, January 6 clearance and January 7 deck removal.
  Preview playback left the existing narrative record unchanged.
- Opened the **unmarked production URL** with an isolated test clock during
  star attachment, on Christmas Eve, and during January cleanup. No preview
  controls, production input listeners, page errors or failed application
  resources were observed. Test images are `/tmp/advent2a-*.png`.

Desktop Chrome review does not establish Steam Gaming Mode performance,
compatibility or dismissal behavior; those remain device-host checks.

## Deliberately deferred

The four weekly candle ceremonies were subsequently added in [Phase 2B](advent-wreath-phase2b.md).
They yield to the existing decorating windows when their fixed midnight opportunities overlap.
No approaching visitor, Christmas Eve candle/tree-lighting ceremony, Christmas gathering,
gift opening, new Christmas persistence, or dream sequences are implemented. Ordinary Advent lights stay subdued; the completed bright
lighting option remains preview-only.
