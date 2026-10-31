# The Little Space Station — Advent 2026 and Christmas story planning

**Status:** Working creative design, started October 22 and updated October 31, 2026. The tree and Christmas Day gift-gathering requirements below are agreed direction; the arriving visitor and full Christmas storyline remain undecided.
This document separates existing production behavior, approved seasonal design, and tentative story ideas. The first proposed implementation phase is limited to tree/present scenery, calendar stages, and preview tools.

Related references:
- [Thanksgiving and Advent implementation](thanksgiving-advent.md) — what is already coded, including preview controls and the existing wreath.
- [Story-year and seasonal ideas](../little-space-station-story-year-and-seasonal-ideas.md) — the broader narrative direction.
- [Story expectations](expectations/story-expectations.md) and [animation expectations](expectations/animation-expectations.md).

## 1. Existing foundation (implemented on `main`)

- Thanksgiving's **Room for One More** gathering and its transition to the Advent arrangement are already implemented.
- The Commons Deck remains approximately **4 × 3.1 world units**; the Thanksgiving implementation did not enlarge it.
- The calendar calculates Advent Sundays. Thanksgiving scenery changes into an evergreen wreath through a six-hour calendar-derived transition, without Pip performing an installation action.
- The wreath has four outer candles (three blue and the third rose) and a taller central white Christ candle.
- The four outer lights accumulate on the Sundays of Advent. The Christ candle currently lights at **00:00 UTC on December 24**, remaining with the other four through January 5; the display clears for the January 6–7 deck dismantling.
- There is no Advent-specific Pip lighting ceremony, tree, multi-week story, or Christmas arrival yet.

**Do not conflate these implemented features with the proposals below.** In particular, a future Christmas Eve evening tree-lighting presentation does not currently change the wreath's existing UTC candle schedule.

## 2. Creative direction

Advent should be **a developing story building toward Christmas**, not merely a calendar that turns on another light each week. It should feel different from Halloween's playful mystery, All Saints' quiet remembrance, and Thanksgiving's friendly hospitality: **expectation, preparation, growing light, and finally a welcome/homecoming**.

Four complementary threads guide the season:

1. **Wreath:** One additional Advent candle each Sunday, with the Christ candle at Christmas.
2. **Tree:** A recognizable traditional-looking tree, assembled from artificial sections and gradually decorated throughout Advent.
3. **Presents:** A small wrapped collection builds beneath the tree; the gifts are **opened together on Christmas Day**, not during Advent or Christmas Eve.
4. **Narrative:** A distant light or signal might suggest someone approaching the station, with a possible homecoming payoff at Christmas. The visitor and signal story remain tentative.

Keep the screensaver peaceful and understated. Let anticipation come from little recurring observations and meaningful character behavior rather than large effects, alarms, or constant activity.

## 3. Christmas tree: explicit requirement

**The tree must be completely decorated by Christmas Eve evening.** This is an agreed design requirement, not an open question.

- Prefer final ornaments **and the topper** in place by Christmas Eve afternoon, leaving no unfinished decorating tasks for the evening gathering.
- The completed tree can be **illuminated or admired** on Christmas Eve evening as a separate celebratory beat. The light-up is not an excuse to leave decorations unfinished. The first implementation phase may provide restrained installed lights and preview-only full illumination; an exact evening ceremony/time rule can be decided in a later phase.
- Avoid making a Christmas visitor deliver the missing topper or other essential part on Christmas Day. The visitor's arrival should be meaningful in its own right.
- Progress should be recognizable from day to day even if the viewer misses individual installation events. Calendar-derived tree **and present** states must reconstruct the proper stage after an absence or time jump.
- The tree should be visible at the normal station camera/framing and complement, not obscure, the wreath, Pip, the utility cabin, the wrapped presents, or the visitor traffic corridor.
- **Deck enlargement is permitted if needed** for believable staging. Any enlargement must account for the existing deck's floor, railings, supports, cabin, seasonal anchors, assembly/dismantling, and orthographic clearance checks. Do not enlarge it automatically without first checking scale and camera readability.

### Agreed tree design and staging

Use a **traditional evergreen silhouette made of artificial modular sections**, not a mechanical tree unfolding from a cylinder. It can have a believable compact mechanical trunk, secured base, and retro-futuristic mounting details, but should read immediately as a Christmas tree. Aim for several overlapping low-poly layers with slight handcrafted irregularity; avoid a dense or hyper-realistic mesh.

Working visual palette: dark and lighter evergreen foliage, warm white lights, **blue, gold, and ivory** ornaments with small copper accents, and a **gold star topper**. Ornament and light counts should remain modest at 1280×800. Mostly emissive bulb materials, not a point light per bulb. Tree lighting can evolve gently; no blinking or strobe effects.

**Provisional size and placement only:** about **1.3–1.6 world units tall** with a **0.9–1.0-unit base diameter**, farther toward the outer/aft portion of the deck so the Advent wreath stays on the existing Thanksgiving table. These are not approved coordinates or fixed dimensions. Inspect actual perspective and top/front/side orthographic views, Pip access, and any dock/solar clearances. Enlarge the deck coherently only if required; do not change the existing assembly/dismantling by accident.

The tree should come from plausible modular sections and holiday provision deliveries through **existing deterministic cargo visits** where feasible; never add more ordinary spacecraft traffic just for decorations.

A working progression (timings and details subject to visual review):

| Period | Wreath / Commons Deck | Tree and narrative |
| --- | --- | --- |
| **Advent I — Sun Nov 29, 2026** | First blue candle; Thanksgiving table is cleared or repurposed. | Tree stand, trunk, and artificial evergreen sections appear; first small wrapped present may arrive. Pip may notice a distant light (tentative). |
| **Advent II — Sun Dec 6** | Second blue candle. | Tree gets garland and restrained light strings; a few more wrapped presents appear. Possible distant-signal beat remains tentative. |
| **Advent III — Sun Dec 13** | Rose candle is lit, conveying quiet joy. | Blue/gold/ivory ornaments gradually accumulate, and the gift pile grows. Possible signal identification remains tentative. |
| **Advent IV — Sun Dec 20** | Fourth blue candle; calm sense of anticipation. | Final ornaments and star topper are installed **by December 23**; all wrapped presents are in place before Christmas Eve. An approaching visitor is still only a candidate story. |
| **Christmas Eve — Thu Dec 24** | Existing Christ-candle behavior; possible future Pip ceremony to discuss. | **Fully decorated tree, including star topper. All presents wrapped and unopened.** Possible gentle tree-lighting/admiration beat in the evening. No gift opening yet. |
| **Christmas Day — Fri Dec 25** | Christmas celebration / visual handoff. | **Friends gather around the tree and open presents together.** The construction and Halloween inspection drones return; a Christmas visitor may join, but its identity is undecided. |
| **Dec 26–Jan 5** | Christmas atmosphere can remain without constantly repeating the main event. | The finished tree remains. Opened boxes, ribbons, or keepsakes may provide a modest aftermath once the gift-opening story has actually completed, without replaying the event. |
| **Jan 6–7, 2027** | Existing seasonal deck clearance/dismantling and story-year renewal boundary. | Tree and holiday props are cleared compatibly with the existing lifecycle. |

**Clock decision still open:** Existing holiday scheduling uses UTC calendar boundaries. If a future presentation promises *Christmas Eve afternoon/evening*, explicitly choose how that maps onto the world clock and viewing time rather than treating UTC midnight as local evening or assuming the user's time zone. The requirement to have the tree ready by the evening must hold even if the screensaver has been closed.

## 4. Christmas presents and the group gathering (agreed direction)

**Presents are important, and they must be opened on Christmas Day, December 25 — not before.** Christmas Eve remains a time of quiet anticipation: the decorated tree is ready, all gifts are wrapped, and the gathering has not yet happened.

- Place a **modest cluster of roughly 3–6 low-poly presents** under or beside the tree. Keep ribbons/bows readable with a few distinct sizes and silhouettes; avoid obscuring the trunk, wreath table, or Pip's walkway.
- Use restrained seasonal wrapping colors: blue, ivory, gold, copper, and occasional muted red. Simple bands and chunky bows are sufficient.
- Presents **accumulate progressively through Advent**, with a finished wrapped arrangement by December 23, or at the very latest before Christmas Eve evening. A few gifts may arrive via existing cargo; the visible state must not rely on someone having watched the deliveries.
- The eventual Christmas Day story is **another everyone-together gathering**, following Thanksgiving's social thread. Pip, the returning **construction drone**, and the **Halloween inspection drone** participate; the Christmas traveler can be included if that character is later selected.
- Show **actual opening and reactions**: a present is approached, a lid/wrapping changes visibly, the recipient responds, and opened boxes or untied ribbons remain recognizable. Physics-based tearing is unnecessary. Avoid gifts simply vanishing.
- Contents are undecided. Possible modest personalized gifts include a tool accessory for Pip, energy/recharge item, small keepsake, emblem, or a tiny model; choose based on the selected Christmas cast, not on asset novelty.
- The opening story should be a **single coherent, interruption-safe Christmas Day narrative**, with checkpoints, once-per-year completion, and a grace/aftermath policy determined in the later Christmas-story phase. Do not mark gifts as opened merely because the clock struck midnight: the opened aftermath must agree with what was actually presented/completed.
- Gifts and the tree remain appropriately visible through the Christmas season and clear before the January 6–7 deck dismantling.

**First phase boundary:** It is appropriate to implement the *wrapped present props, identities, staged additions, and preview-only prototype opened visuals now*. **Do not implement the Christmas Day opening event yet, and do not automatically change production gifts to opened state on December 25**. Until the story is built, wrapped props may remain temporarily through the holiday; avoid fabricating a celebration. The story, presents' recipients/contents, and persistent opened aftermath belong to a later phase.

## 4. Candidate multi-week story (tentative)

Working titles: **Pip and the Coming Light** / **Pip and the Far-Off Star**. Neither is selected.

**Candidate guest:** A small long-range exploration drone returning after an extended journey. Visual thought: compact, slightly weathered cream/teal shell, small antennae or fins, and a warm golden navigation beacon. It would be more independent and adventurous than the construction and Halloween inspection drones.

Possible progressive beats, **not yet a locked script**:

1. **First week:** Pip notices a faint, periodic light far beyond the station.
2. **Second week:** A faint signal suggests more than a random star or reflection, drawing Pip's curiosity.
3. **Third week:** Pip recognizes a familiar survey identifier or realizes a small traveler is coming home. Preparation feels more purposeful.
4. **Fourth week:** The approach becomes clear; Pip watches and waits as holiday preparations finish.
5. **Christmas Eve/Day:** The explorer arrives at the now fully decorated and illuminated station. Pip welcomes the tired traveler, offers a place to rest or recharge, and shares a quiet moment near the tree and wreath.

The suggested emotional payoff is **homecoming**: the arrival itself is the gift. The traveler need not bring a crucial tree ornament, magic object, or device to 'complete Christmas.' This would expand the station's recurring cast, perhaps allowing the explorer to visit again in future years.

**Do not treat the arriving probe or its light as a literal portrayal of Christ or a replacement for the Star of Bethlehem.** The wreath/Christ candle and other Christmas observances carry their own symbolism. The visitor would be a modest science-fiction story of companionship and return.

The character choice, its origin, whether the signal is mysterious or simply unexpected, the precise arrival time, and the holiday's final payoff are **all still open to discussion**. The user explicitly left these questions unanswered and wants to consider them over upcoming days; no returning explorer has been approved as canon.

## 6. Pip's proposed Advent behavior

- **Opening preparation:** An approximately 60–75-second vignette was suggested for Pip arranging or installing the wreath, preparing the tree, inspecting the result, and lighting the first candle.
- **Weekly rituals:** Shorter 20–35-second opportunities for Pip to approach, face, tend, and light the next candle, with small distinct gestures and some stillness.
- **Progressive tree and gift work:** Pip assembles sections, adds garland, ornaments, lighting, and the topper, and occasionally brings wrapped presents beneath the tree. Holiday parcels can arrive on existing scheduled cargo visits. Keep gift opening reserved for Christmas Day.
- **Background foreshadowing:** The distant light or signal appears sparingly rather than running as a continuous spectacle. It may provoke a subtle pause or glance from Pip.
- **Christmas celebration:** Completion and illumination of the decorated tree, then a meaningful arrival/homecoming beat (if that story direction is selected).

Avoid a separate persisted major incident for every candle lighting. Prefer deterministic calendar scenery and small optional observational actions. The main Christmas story, if selected, should use the existing safe-window, milestone, persistence, and interruption-recovery conventions.

A viewer should be able to miss individual Sundays and still understand the scene. Never require all earlier episodes to have been witnessed before showing the Christmas outcome. Date jumps should derive the correct decoration state without inventing completed story records.

## 7. Practical implementation boundaries (for later)

This is planning documentation only. **No code changes have been authorized in this task.**

When ready, prefer small, independently reviewable assignments rather than a single expensive Codex session:

1. **Tree, wrapped gifts, and deck staging:** Evaluate space, build the agreed modular traditional low-poly tree and 3–6 wrapped gifts, derive their progressive Advent states, and add meaningful preview controls. Prototype *opened* visuals in preview only if inexpensive. Avoid the later Christmas group-opening story.
2. **Advent actions:** Add Pip's opening setup, brief weekly candle-lighting/decoration activities, and restrained seasonal color/light progression; preserve the existing wreath calendar.
3. **Narrative foreshadowing:** Only after deciding who or what is approaching, implement subtle seeded light/signal beats and their opportunity windows.
4. **Christmas Day gathering:** Implement the actual group-opening story with shared character choreography, personalized gifts, presentation checkpoints, opened aftermath, optional visitor/homecoming payoff, and graceful expiry. Handle the Christmas Eve evening illumination and January cleanup compatibly.

Keep production offline/passive, avoid increasing routine ship frequency, protect other holiday histories, and verify all 3D interactions in production perspective plus top/front/side orthographic views. Check the real Steam Deck host separately from desktop Chrome.

## 8. Open creative decisions — discuss before implementation

- Is the incoming character **the returning long-range explorer**, another familiar drone, or something more extraordinary?
- How explicitly should Pip identify the distant signal, and should the audience solve the 'mystery' before Pip does?
- Does the explorer arrive **Christmas Eve evening or Christmas Day**, and what exact action provides the emotional payoff?
- Is the explorer a recurring visitor after Christmas? Does it bring anything incidental, or arrive empty-handed?
- What exact coordinates, tree height, and deck clearances work best when visually tested? Does the Commons Deck need an expansion? (The *traditional modular artificial tree* and general ornament palette are chosen.)
- Should the tree have a distinct lights-on ceremony, and how should Christmas Eve **evening** be defined relative to the project's UTC calendar?
- What personalized gifts will each returning character receive, and what gift-opening gestures or aftermath should survive completion?
- How much Advent animation should be one-off narrative versus quiet, repeatable Pip routines, without competing with traffic or previous story milestones?

**Decisions already made:** Christmas builds across Advent; the tree is a traditional-looking artificial sectional evergreen, progressively decorated and completely finished (including topper) before Christmas Eve evening; presents build beneath it and remain **wrapped until Christmas Day**, when Pip and returning friends gather to open them; avoid nonstop exceptional events. The identity of the arriving light, gift contents, and precise Christmas story choreography remain undecided.
