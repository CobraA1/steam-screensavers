# The Little Space Station — Advent 2026 and Christmas story planning

**Status:** Working creative design, discussed October 22, 2026. **Not an implementation request or approved final story.**
The user intends to revisit the choices over the next several days and may defer substantial implementation until a weekly Codex usage reset. This document records what has been discussed, distinguishing agreed direction from tentative ideas.

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

Three parallel threads were proposed:

1. **Wreath:** One additional Advent candle each Sunday, with the Christ candle at Christmas.
2. **Tree:** A real, clearly visible Christmas tree is progressively assembled and decorated throughout Advent.
3. **Narrative:** A distant light or signal increasingly suggests someone is approaching the station, with a payoff at Christmas.

Keep the screensaver peaceful and understated. Let anticipation come from little recurring observations and meaningful character behavior rather than large effects, alarms, or constant activity.

## 3. Christmas tree: explicit requirement

**The tree must be completely decorated by Christmas Eve evening.** This is an agreed design requirement, not an open question.

- Prefer final ornaments **and the topper** in place by Christmas Eve afternoon, leaving no unfinished decorating tasks for the evening gathering.
- The completed tree can be **illuminated or admired** on Christmas Eve evening as a separate celebratory beat. The light-up is not an excuse to leave decorations unfinished.
- Avoid making a Christmas visitor deliver the missing topper or other essential part on Christmas Day. The visitor's arrival should be meaningful in its own right.
- Progress should be recognizable from day to day even if the viewer misses individual installation events. Calendar-derived tree state must reconstruct the proper stage after an absence or time jump.
- The tree should be visible at the normal station camera/framing and complement, not obscure, the wreath, Pip, the utility cabin, or the visitor traffic corridor.
- **Deck enlargement is permitted if needed** for believable staging. Any enlargement must account for the existing deck's floor, railings, supports, cabin, seasonal anchors, assembly/dismantling, and orthographic clearance checks. Do not enlarge it automatically without first checking scale and camera readability.

A working progression (timings and details subject to visual review):

| Period | Wreath / Commons Deck | Tree and narrative |
| --- | --- | --- |
| **Advent I — Sun Nov 29, 2026** | First blue candle; Thanksgiving table is cleared or repurposed. | Tree base or early assembly begins. Pip may notice the first faint, distant point of light. |
| **Advent II — Sun Dec 6** | Second blue candle. | Pip adds ornaments or garland. The distant light reappears; perhaps a weak signal is detected. |
| **Advent III — Sun Dec 13** | Rose candle is lit, conveying quiet joy. | Tree becomes more colorful. Pip may learn the signal is intentional or recognize an old survey identifier. |
| **Advent IV — Sun Dec 20** | Fourth blue candle; calm sense of anticipation. | Tree is nearly finished, with remaining decorations scheduled **before** Christmas Eve evening. The approaching visitor becomes easier to recognize. |
| **Christmas Eve — Thu Dec 24** | Existing Christ-candle behavior; possible future Pip ceremony to discuss. | **Tree fully decorated by afternoon, definitely by evening.** Evening celebration may illuminate the completed tree; visitor arrival timing remains open. |
| **Christmas Day — Fri Dec 25** | Christmas celebration / visual handoff. | Proposed traveler arrives or is welcomed; Pip offers companionship and a place to rest or recharge. |
| **Dec 26–Jan 5** | Christmas atmosphere can remain without constantly repeating the main event. | Finished tree remains as appropriate for the Christmas season; a completed story becomes a memory, not an automatically replayed live event. |
| **Jan 6–7, 2027** | Existing seasonal deck clearance/dismantling and story-year renewal boundary. | Tree and holiday props are cleared compatibly with the existing lifecycle. |

**Clock decision still open:** Existing holiday scheduling uses UTC calendar boundaries. If a future presentation promises *Christmas Eve afternoon/evening*, explicitly choose how that maps onto the world clock and viewing time rather than treating UTC midnight as local evening or assuming the user's time zone. The requirement to have the tree ready by the evening must hold even if the screensaver has been closed.

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

## 5. Pip's proposed Advent behavior

- **Opening preparation:** An approximately 60–75-second vignette was suggested for Pip arranging or installing the wreath, preparing the tree, inspecting the result, and lighting the first candle.
- **Weekly rituals:** Shorter 20–35-second opportunities for Pip to approach, face, tend, and light the next candle, with small distinct gestures and some stillness.
- **Progressive tree work:** Pip adds tree sections, garland, ornaments, lighting, and finally a topper in believable steps, using provisions that can plausibly arrive on scheduled cargo visits.
- **Background foreshadowing:** The distant light or signal appears sparingly rather than running as a continuous spectacle. It may provoke a subtle pause or glance from Pip.
- **Christmas celebration:** Completion and illumination of the decorated tree, then a meaningful arrival/homecoming beat (if that story direction is selected).

Avoid a separate persisted major incident for every candle lighting. Prefer deterministic calendar scenery and small optional observational actions. The main Christmas story, if selected, should use the existing safe-window, milestone, persistence, and interruption-recovery conventions.

A viewer should be able to miss individual Sundays and still understand the scene. Never require all earlier episodes to have been witnessed before showing the Christmas outcome. Date jumps should derive the correct decoration state without inventing completed story records.

## 6. Practical implementation boundaries (for later)

This is planning documentation only. **No code changes have been authorized in this task.**

When ready, prefer small, independently reviewable assignments rather than a single expensive Codex session:

1. **Tree and deck staging:** Evaluate room, design a readable low-poly tree, add deterministic assembly/decoration stages, shipments as appropriate, and relevant preview controls.
2. **Advent actions:** Add Pip's opening setup, brief weekly candle-lighting/decoration activities, and restrained seasonal color/light progression; preserve the existing wreath calendar.
3. **Narrative foreshadowing:** Only after deciding who or what is approaching, implement subtle seeded light/signal beats and their opportunity windows.
4. **Christmas resolution:** Implement the chosen arrival and quiet payoff, Christmas Eve evening tree-lighting presentation as appropriate, graceful expiry, and January cleanup compatibility.

Keep production offline/passive, avoid increasing routine ship frequency, protect other holiday histories, and verify all 3D interactions in production perspective plus top/front/side orthographic views. Check the real Steam Deck host separately from desktop Chrome.

## 7. Open creative decisions — discuss before implementation

- Is the incoming character **the returning long-range explorer**, another familiar drone, or something more extraordinary?
- How explicitly should Pip identify the distant signal, and should the audience solve the 'mystery' before Pip does?
- Does the explorer arrive **Christmas Eve evening or Christmas Day**, and what exact action provides the emotional payoff?
- Is the explorer a recurring visitor after Christmas? Does it bring anything incidental, or arrive empty-handed?
- What are the precise tree placement, size, and decoration style? Does the Commons Deck need an expansion?
- Should the tree have a distinct lights-on ceremony, and how should Christmas Eve **evening** be defined relative to the project's UTC calendar?
- How much Advent animation should be one-off narrative versus quiet, repeatable Pip routines, without competing with traffic or previous story milestones?

**Decisions already made:** Christmas should be built up to across Advent; a visible tree is essential; the tree must be entirely decorated by Christmas Eve evening; do not turn the season into nonstop exceptional events. The identity of the arriving light remains deliberately undecided.
