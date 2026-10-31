# Advent tree and wrapped presents — Phase 1

Implemented October 31, 2026. This is calendar scenery, independent of stories,
deliveries witnessed, saved checkpoints, or storage availability. It does not
present a decorating activity, light candles through Pip, open gifts, or create
a Christmas visitor or gathering.

## Design and location

The artificial evergreen has three overlapping, slightly irregular low-poly
sections, dark and lighter green faces, a visible trunk and copper section
couplers, and a bolted four-foot mounting stand. It is approximately **1.55 units
tall**, including the gold five-point star, and **1 unit across** at the bottom.
There are three copper garland/light strings, 21 warm white bulbs, and 26 modest
blue/gold/ivory ornaments. Bulbs and ornaments use instanced meshes; lighting
uses emissive bulbs and one small bounded fill, with no blinking.

The base is at station-local **(-6.6, -0.43, 0.65)** on the outer aft deck.
The initial position on the old deck was physically clear but hid behind the
cabin in production perspective. Extending the aft edge by **0.6 units** gives
the tree a distinct silhouette without moving the cabin, wreath table, existing
seasonal decorations, or Pip's work anchors.

The deck is now **4.6 × 3.1 units**, a 15% floor-area increase. Floor layers and
tiles, longitudinal beams, aft and middle cross supports, diagonal braces,
rail corners/stanchions, and their lamp/support assemblies follow the extension.
All six existing rigid assembly groups retain their lifecycle and travel paths;
the +X spacecraft corridor and solar array attachments are unchanged.

## 2026 calendar, UTC

| Date | Scenery |
| --- | --- |
| November 29 | Mount, trunk, and all three evergreen sections. No garland, ornaments or star yet. |
| November 30 | First wrapped present. |
| December 6, 8, 10 | One, two, then all three garland/light strings; restrained steady illumination. |
| December 7 | Second present. |
| December 13, 15, 17 | 6, 12, then 18 ornaments. Third present on December 13. |
| December 20 | 22 ornaments and fourth present. |
| December 22 | 24 ornaments and the star topper. |
| December 23 | All 26 ornaments and all five wrapped presents. Tree completely decorated. |
| December 24–January 5 | Finished tree and wrapped gifts remain. No automatic opening or evening light-up ceremony. |
| January 6 | Tree and presents clear at 00:00 UTC; deck dismantling proceeds on its existing schedule. |
| January 7 | Deck removed at the existing renewal boundary. |

The calculated Advent Sundays drive the early stages. Later Advent starts in
other years compress the final decoration window to finish by December 23.
January resolves the preceding Christmas season. The actual deck still uses
its inaugural 2026–2027 lifecycle; this is not annual reconstruction of the deck.
Custom longer deck-removal durations may hide scenery sooner when the deck
ceases to be ready. Props never remain floating over a dismantling floor.

## Gifts and supplies

Five gifts have stable IDs, distinct sizes, crossed ribbon bands, chunky bows,
and separate named lids for a future opening animation:

- `blue-long-parcel`: low blue box with gold ribbon.
- `ivory-square-box`: ivory cube with blue ribbon.
- `copper-tall-box`: taller copper box with ivory ribbon.
- `muted-red-parcel`: muted red box with gold ribbon.
- `gold-small-box`: small gold box with blue ribbon.

They are arranged beside the tree with separate footprints, clear of the wreath
table, cabin, rails and current Pip work positions. Their IDs do not yet assign
recipients or contents. **Every gift remains wrapped**, including on December
25. Opened aftermath must eventually come from the Christmas story, not a date.

Some existing freight visits during Advent can carry provision cartons: mounting
fittings/evergreen sections, then garland/light strings, then ornaments/wrapped
parcels. These use the existing seeded shipment selection, crate models,
single-height racks and transfer animation. No extra ship visits or inventory
records are created. Installed scenery does not depend on those cartons.

## Preview and verification

Open **Thanksgiving & Advent → Christmas tree & wrapped presents · 2026**.
Buttons cover sections, the first present, intermediate light strings and
ornaments, finishing, the star, the completed five-gift arrangement, Christmas
Eve, an Advent supply delivery, January 5, January 6 cleanup, and January 7.
**Tree · completed, full warm lights** temporarily previews brighter illumination;
ordinary dates and **Natural calendar** clear it. It has no production setting
or automatic evening trigger. Existing date/time controls allow other samples.
January shortcuts use the real deck lifecycle rather than forcing a future-year
deck installation over cleanup.

`christmas-tree.js` owns the small calendar and stable gift descriptors;
`christmas-tree-renderer.js` builds bounded props once. They join the existing
holiday calendar, renderer and preview, without changing persistence schemas.
`tests/christmas-tree.test.js` checks UTC boundaries, decoration counts, gift
identities, Christmas/New Year wrapping, January removal, reverse date/lighting
seeks, actual mesh clearances, and read-only scenery behavior. Existing seasonal
and lifecycle tests continue to cover Thanksgiving, Halloween, remembrance,
traffic and rigid deck assembly/removal.

Use production perspective plus top/front/side orthographic views for placement.
Check the finished tree in sunlight and shadow, then inspect the older seasonal
scenes and deck assembly/removal. Desktop Chrome review does not establish Steam
Gaming Mode performance or dismissal behavior.

Review on October 31, 2026:

- Full suite: **156 tests passing**, including the eight focused tree tests and
  the existing holiday, cargo, roof, dream and module-lifecycle tests.
- Inspected 1280×800 production perspective and top/front/side orthographic
  captures of sections, progressive strings/ornaments, finished gifts, cleanup,
  and the enlarged deck. Front-view occlusion by the station is expected; the
  top and side views confirm the hidden physical clearances.
- Compared the production arrangement at 1920×1080 and 2560×1600; checked subdued
  and full warm lighting in shadow, and actual foreground playback.
- Reviewed Thanksgiving's table interaction, Phantom untangling, remembrance
  stillness, module assembly/dismantling, and the existing freight service with
  Advent provisions. No additional ship schedule was introduced.
- Dedicated Chrome reported no page errors or missing application resources in
  the final reviews. An unmarked production URL showed no preview controls.
  Screenshots are `/tmp/advent-tree-*.jpg` and `/tmp/advent-regression-*.jpg`.
  Gaming Mode checks remain for the device itself.

## Later phases

Pip decorating or lighting candles, the Christmas Eve evening lighting ceremony,
the approaching visitor, the Christmas Day gathering, gift opening and its
persistent aftermath remain future work. There are no opened gift variants or
Christmas story records in this phase. See the [planning document](advent-christmas-story-planning.md).
