# The Little Space Station — Story Year, Dreams, and Seasonal Events

**Status:** Creative direction and phased design backlog; **not** a request to implement every feature in one pass.  
**Project:** The Little Space Station — Steam Deck procedural narrative screensaver  
**Prepared:** 2026-10-16  
**Companion document:** `pip-and-the-stubborn-antenna-design.md`

## 1. The guiding idea

The station is a small, evolving world rather than an endless collection of unrelated animations. Over the course of a calendar year it gathers experiences, decorations, modifications, and memories. Pip, the maintenance robot, goes about ordinary work, periodically recharges, and sometimes *dreams about* past events. In early January the station undergoes a fictional annual renewal that creates a new beginning without erasing its personality.

Seasonal events should supply much of the variety: Halloween and All Saints' Day first, followed by Thanksgiving and Christmas. Their differing moods matter. The world should not become a constant parade of exceptional events.

> **Generate the ordinary world freely; preserve the extraordinary moments carefully.**

### What is already implemented (as of the supplied 2026-10-15 source archive)

- An automatically running, passive Three.js scene with a 140% production camera framing and retro-futuristic art direction.
- Deterministic absolute-time spacecraft traffic with varied quiet periods and service purposes.
- Pip's deterministic maintenance tasks, task-specific poses, standby, and a charging-pad *location* (not yet a full sleep/dream cycle).
- Three separate clocks: world, presentation, and animation time; an interactive preview harness with simulated times, event forcing, pause, stepping, and screenshot-oriented debugging capabilities described in the workspace's current guidelines.
- Stylized orbital sunlight/shadow and slowly changing planetary seasons.
- A small namespaced Local Storage narrative checkpoint record in `persistence.js` (**v2**). **This is not yet a multi-event story history.** `app.js` loads it but does not yet restore an interrupted story from it.

The notes below are proposed new behavior, not claims about implemented functionality.

## 2. The annual narrative cycle

### Story year

Use **one narrative arc per story year**, approximately aligned with the real calendar. The station has a beginning, accumulation of small changes and stories, and an annual renewal shortly after New Year's Day.

**Proposed target:** January **7**, configurable within an early-January renewal window. Use an explicit calendar/time-zone convention (prefer a single named zone or UTC for internally stable IDs; decide this deliberately), rather than assuming the browser's locale or a fixed 365-day duration can represent calendar years and holidays. The planet's *fictional* 365-day seasonal shader cycle may remain separate from holiday/calendar scheduling.

Practical behavior:

1. **During the year:** Minor/major stories may become eligible. Committed incidents leave bounded persistent consequences, such as a repair plate on the antenna.
2. **Late December / early January:** The station may show reflective behavior, special deliveries, or small preparations for its yearly overhaul.
3. **Around January 7:** A maintenance or refurbishment vessel visits. Pip supervises an annual inspection and replacement of some worn components. The station visibly returns to a familiar baseline.
4. **After renewal:** The next story-year starts with a fresh annual event namespace and new derived seeds for year-specific choices. The *station identity and Pip* remain recognizable.
5. **If the viewer never sees the overhaul:** Logical annual rollover still occurs. A short renewal vignette may remain pending for an eligible viewing session, but the world should not stay stuck in December or replay a year of old actions.

**Important distinction:** A world-state reset and the *presentation* of the reset are separate. The annual boundary must be idempotent and not depend on being open at midnight or receiving a shutdown callback. If the user returns in February, the station can already look renewed while the director offers a short, contextually coherent "new year" aftermath rather than staging an impossible live overhaul.

### What renews vs. what survives

| Renew at the story-year boundary | Preserve across story years |
| --- | --- |
| Temporary seasonal props and event-specific visual modifications | World/station identity and Pip's recognizable appearance |
| Completed/pending status for incidents scoped to the prior story year | A bounded archive of meaningful finished stories |
| Year-specific seeded choices and cooldowns | Stable world seed and long-term user preferences |
| A visible repair plate installed for that year's antenna mishap | The fact that the story happened, for memory/dream purposes |

Do **not** reset traffic identity, camera settings, or all browser storage. Never clear storage belonging to other screensavers.

### IDs and compatibility

Use stable event instances such as `{storyYear}:{eventType}:{derivedInstanceId}`. A one-time incident means *once in a particular story year* unless explicitly defined as one-time for the lifetime of the station. Archive records should identify the original year.

For the first few months, October–December 2026 can serve as a **partial inaugural story year**. The first proposed renewal is January 2027. Do not retroactively generate months of unseen 2026 incidents merely because the program began late in the year.

## 3. Pip's charging and dreaming

### Charging is not the station's orbital night

The current 97-minute sunlight/shadow cycle is environmental lighting, **not Pip's work/sleep calendar**. Avoid coupling a fixed eight-hour real-night sleep to local clock hours; many viewers may only see the screensaver in the evening. Pip should remain a living character at all typical viewing times.

Proposed approach:

- Give Pip a deterministic **duty/recharge rhythm** with charging periods interspersed across the day, and optionally a longer rest once per fictional station day.
- Derive the rest pattern from a separate seed and absolute world time. Allow a non-24-hour recurrence or rotating shift so the same real-world hour is not permanently asleep.
- Do not abruptly interrupt cargo service or a narrative incident. Finish a safe step, defer charging, or reschedule the presentation so the scene stays coherent.
- Charging has a legible animation: Pip returns to the pad, settles, lowers its head/visor, dims ordinary activity lights, and displays a soft charging pulse. The station's ships and environment continue as usual.
- Not every charging period should feature a dream; quiet rest is part of the charm.

### Dreams as memory, not time travel

A **dream** is a replay or reinterpretation of a completed event. It **does not** run the live event a second time, change ship schedules, repair the antenna again, or apply world consequences twice.

A modest initial presentation could be a small stylized holographic memory vignette near the charging pad. Alternative: a short, softened reprise on the main stage using a presentation-only snapshot. Choose the option that remains readable from across a room and avoids disrupting the current world. Do not add a full second simulation/rendering engine just to show dreams.

Potential dream selection rules:

- Choose only committed, actually completed stories; don't dream about an incident whose ending has not occurred.
- A story *presented* by the screensaver is **not proven to have been seen by the viewer**. Dreams make a repeat encounter possible, not guaranteed.
- Weight memorable and recent events more often, but avoid repeating the same dream every charging cycle.
- Dreams may occur days or months later and, after annual renewal, may draw from a small archived selection.
- Replays retain the story's original variant and outcome via stable seeds plus minimal saved facts.
- Early dreams should replay faithfully; exaggerations or Pip imagining itself as a hero can be optional future embellishments, visibly distinguished from history.

### Suggested small memory record

For a completed story, retain only what is not safely derived:

```json
{
  "storyYear": 2026,
  "instanceId": "2026:stubborn-antenna:...",
  "type": "stubborn-antenna",
  "variantSeed": "...",
  "outcome": "repaired-with-plate",
  "completedAtMs": 0,
  "eligibleForDream": true
}
```

*Illustrative shape only.* Let Codex choose a versioned schema compatible with the real code. `completedAtMs` is a placeholder in this example, not a real event time. Store a bounded set of meaningful records rather than frame histories or videos. Keep dreams read-only with respect to story completion and world effects.

## 4. The first holiday season

These events should use **real calendar dates**, distinct from the planet's fictional orbital year. Dates below refer to **2026**; recurrence in later calendar years should be rule-based where applicable.

| Occasion | Date / window | Proposed mood and small first implementation |
| --- | --- | --- |
| **Halloween** | October 31; decorations may begin several days earlier | Playful mystery: a little ghost-like visiting drone, puzzling crate, harmless scare, orange accent lights or tiny decorations. Pip's cautious curiosity is the center of the joke. |
| **All Saints' Day** | November 1 | Quiet, reflective contrast to Halloween: Pip tends a small remembrance beacon or light; a brief constellation of lights or station-wide moment of stillness. Avoid turning it into another prank. |
| **Thanksgiving (U.S.)** | November 26, the fourth Thursday of November | A special delivery of provisions, an oversized food crate, or a subtle gathering glimpsed through station windows; small moments of gratitude and companionship. |
| **Christmas** | December 25; modest lead-in during December | Warm lights, a little tree or star in a visible window, a delivery or gift and a small multi-stage moment of wonder; can be more reflective than the other holidays. |
| **Annual renewal** | Around January 7, 2027 | Refurbishment ship, Pip overseeing maintenance, retiring temporary repairs and beginning a new story year. |

**Seasonal decorations and seasonal stories are different systems.** Decorations can be reconstructed deterministically for date windows. Narrative sequences require selection, presentation checkpoints, interruption recovery, and meaningful consequences.

Holiday stories should have an *eligibility window*, not a hard requirement to be watching at precisely midnight on their calendar date. Do not manufacture an "active Christmas morning" in late January; once a holiday window ends, either save a completed memory for dreams, present a coherent aftermath, or let the opportunity expire gracefully. The correct policy can differ by event.

Treat Halloween and All Saints' Day as separate occasions with different visual tones; don't let Halloween decorations trivialize the more reflective November 1 sequence.

## 5. Story director priorities and collisions

Suggested priority order when opportunities conflict:

1. Resolve or resume an already-committed, incomplete **major story** at a coherent chapter boundary.
2. Eligible time-sensitive holiday moments that still fit their window.
3. Other one-time narrative incidents.
4. Dreams during compatible charging periods.
5. Routine maintenance, cargo handling, and ordinary traffic.

The director must respect reality: a precomputed dock visit shouldn't vanish just to make room for a joke; Pip should not teleport away from a loaded cargo container. Where necessary, wait for a safe idle window or choose an aftermath presentation. Background schedules remain deterministic.

Do not use random spectacle as a substitute for interactions. A survey visit, a tired Pip, an unreliable antenna, and a holiday delivery become interesting because they have separate motivations and occasionally affect one another.

## 6. Persistence and clock architecture

The current `persistence.js` stores **one v2 last-checkpoint record**. Full story years, a dream archive, and unfinished chapter recovery require an explicitly designed, versioned extension. `app.js` currently loads the record but does not restore pending story progress from it.

Recommended future separation:

- **World-derived facts:** Ships, environmental conditions, ordinary Pip maintenance, holiday decoration dates, year number.
- **Narrative commitments:** Selected incident instance, deterministic variants, chapter checkpoints, displayed payoff, year-specific consequences.
- **Memory/archive:** A bounded set of completed stories eligible for safe read-only replay.
- **Presentation state:** Which chapter may be shown, progress achieved *on screen*, cooldowns, and temporary dream playback.

Make commits at meaningful observed transitions, not every frame or when an event merely starts. Commits must be idempotent. Preview forcing, scrubbing, and time jumps should not commit unless explicitly requested. Missing or evicted storage must not stop the screensaver.

Respect the existing three-clock contract:

- **World clock**: real calendar, traffic, station year, rest opportunity scheduling.
- **Presentation clock**: story and dream chapters while meaningfully on screen.
- **Animation clock**: smooth motion and camera easing (with hitch clamps).

## 7. Implementation order and guardrails

This document sets the **direction**, not one giant sprint. Suggested order:

1. **First:** Implement `Pip and the Stubborn Antenna` from the companion document. Give it a simple, versioned, completed-story record designed so later dreaming/year-rollover can use it. Do **not** implement all dream UI and holiday systems to deliver this incident.
2. **Then:** Add Pip's charging rhythm and a **single faithful replay** of the antenna incident as the first dream, without replayed side effects.
3. **Next:** Deliver a small Halloween vignette and an independently toned All Saints' Day moment, with deterministic date windows. Prioritize completing those over generalizing into a large calendar framework.
4. **Then:** Thanksgiving and Christmas; gradually reuse the same event/director interfaces.
5. **By early January:** Build the annual renewal behavior with safe rollover even when the saver is inactive.

In all phases, read the latest workspace `AGENTS.md`, follow the passive Steam-host rules, retain browser-preview isolation, run `npm test` where available, use the established browser/screenshot harness if configured, and report what was actually checked. Preserve the retro-futuristic style and bounded performance/power demands of a Steam Deck screensaver.

## 8. Open creative decisions (do not block the first incident)

- Exact annual renewal date/window, time-zone authority, and whether the archive is kept for one year or several.
- The ideal frequency and recurrence of charging/dreaming, relative to common 10–60-second viewing sessions.
- Whether dreams appear in a floating hologram, a scene-wide softened reprise, or alternate between the two.
- How much Christmas imagery should be visible on the station exterior versus in its windows.
- Whether the same one-time incident can recur with a fresh variant in later story years.

These can be tuned after the first story and dream replay are observed on the actual Steam Deck.

## 9. Long-term success criteria

- The viewer may encounter familiar objects or notice a real modification left by a story.
- Pip sometimes rests, sometimes works, and occasionally dreams, rather than being perpetually animated.
- Dream replay is coherent, distinguishable from live action, and incapable of duplicating world effects.
- Holidays feel distinct and rare, with calendar-appropriate visuals and a fair chance of presentation.
- The station renews annually without silently corrupting its history or requiring the screensaver to run on January 7.
- Ordinary activity and quiet periods remain pleasant in their own right.
