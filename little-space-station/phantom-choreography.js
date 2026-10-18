// Station-local staging shared by Pip and the visitor. Every beat can be sought
// directly; its first pose agrees with the previous beat's final pose.
export const PHANTOM_WORK = Object.freeze([-2.5, 2.1, 1.88]);
export const PHANTOM_WORK_YAW = Math.atan2(-0.28, 0.4);
export const Ease = (value) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
const Mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const Offset = (v, x, y, z) => [v[0] + x, v[1] + y, v[2] + z];

export function PhantomActors(beat, progress, home = [-0.2, 1.16, 0.72]) {
  const p = Math.max(0, Math.min(1, progress));
  const work = PHANTOM_WORK;
  const hidden = Offset(work, -0.6, 0.25, -0.6);
  const lifted = Offset(work, 0, 0.08, 0);
  const held = Offset(work, 0.14, 0.3, -0.08);
  const freed = Offset(work, -0.45, 0.55, 0.35);
  const resting = Offset(work, -0.5, 0.1, 0.25);
  const trailing = Offset(home, -0.48, 0.8, 0.35);
  const droneStart = Offset(work, 0, -0.12, 0);
  let cover = work, drone = droneStart, coverOpacity = 1, droneOpacity = 0, roll = 0;
  if (beat === "glimpse") {
    cover = Mix([-5.4, 2.5, 2.1], work, Ease(p));
    coverOpacity = Ease(p / 0.16);
  } else if (beat === "vanish") {
    cover = Mix(work, hidden, Ease(p));
    coverOpacity = 1 - Ease(p);
  } else if (beat === "search") {
    cover = hidden; coverOpacity = 0;
  } else if (beat === "reveal") {
    cover = Mix(hidden, work, Ease(p / 0.5));
    cover[1] += 0.08 * Ease((p - 0.5) / 0.5);
    coverOpacity = Ease(p / 0.25);
    droneOpacity = Ease((p - 0.25) / 0.35);
  } else if (beat === "untangle") {
    const grasp = Mix(lifted, held, Ease(p / 0.65));
    cover = Mix(grasp, freed, Ease((p - 0.65) / 0.35));
    roll = -0.5 * Ease(p);
    droneOpacity = 1;
  } else if (beat === "drone-departure") {
    cover = Mix(freed, resting, Ease(p));
    roll = -0.5;
    drone = Mix(droneStart, [-8, 5, 3], Ease(p));
    droneOpacity = 1 - Ease((p - 0.65) / 0.35);
  } else if (beat === "trailing-cover") {
    cover = Mix(resting, trailing, Ease(p));
    roll = -0.5 + 0.3 * Ease(p);
    drone = [-8, 5, 3];
  } else if (beat === "final-surprise") {
    cover = Mix(trailing, [-3.2, 3.4, 2], Ease((p - 0.35) / 0.65));
    roll = -0.2 + 0.6 * Ease(p);
    coverOpacity = 1 - Ease((p - 0.65) / 0.3);
    drone = [-8, 5, 3];
  }
  return { cover, drone, coverOpacity, droneOpacity, roll };
}
