// Small, read-only scenery calendar. No inventory, story progress or storage.
const DAY = 86_400_000;
export const CHRISTMAS_TREE_POSITION = Object.freeze([-6.6, -0.43, 0.65]);
export const CHRISTMAS_PRESENTS = Object.freeze([
  { id: 'blue-long-parcel', size: [.34, .19, .22], position: [-5.38, -.43, .73], color: 0x355c7c, ribbon: 0xd8b66c },
  { id: 'ivory-square-box', size: [.27, .25, .27], position: [-6.05, -.43, 1.38], color: 0xe3dcc1, ribbon: 0x426787 },
  { id: 'copper-tall-box', size: [.22, .32, .22], position: [-5.65, -.43, 1.15], color: 0xa56c47, ribbon: 0xe4d7b5 },
  { id: 'muted-red-parcel', size: [.3, .2, .24], position: [-5.48, -.43, 1.51], color: 0x8d4b49, ribbon: 0xd3b16b },
  { id: 'gold-small-box', size: [.24, .23, .23], position: [-5.92, -.43, .78], color: 0xc6a359, ribbon: 0x365e79 },
].map(gift => Object.freeze({ ...gift, size: Object.freeze(gift.size), position: Object.freeze(gift.position) })));

// Advent's calculated Sundays remain authoritative; finish by Dec 23 even
// in a year whose fourth Advent Sunday would otherwise be as late as Dec 24.
export function ChristmasTreeCalendar(time, advent, christmas) {
  const second = advent + 7 * DAY, third = advent + 14 * DAY;
  const final = Math.min(advent + 21 * DAY, christmas - 5 * DAY);
  const complete = christmas - 2 * DAY;
  const active = time >= advent && time < christmas + 12 * DAY;
  const garlandBands = active && time >= second ? 1 + Number(time >= second + 2 * DAY) + Number(time >= second + 4 * DAY) : 0;
  const ornamentCount = !active ? 0 : time >= complete ? 26 : time >= final + 2 * DAY ? 24 : time >= final ? 22
    : time >= third + 4 * DAY ? 18 : time >= third + 2 * DAY ? 12 : time >= third ? 6 : 0;
  const presentCount = active ? Number(time >= advent + DAY) + Number(time >= second + DAY) + Number(time >= third)
    + Number(time >= final) + Number(time >= complete) : 0;
  const star = active && time >= Math.min(final + 2 * DAY, complete);
  return { active, sections: active ? 3 : 0, garlandBands, ornamentCount, presentCount, star,
    complete: active && time >= complete,
    stage: !active ? 'absent' : time >= complete ? 'complete' : time >= final ? 'finishing'
      : ornamentCount ? 'ornaments' : garlandBands ? 'garland-and-lights' : 'evergreen-sections' };
}
