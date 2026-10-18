import { CreateRandom, DeriveSeed, Pick } from "./random.js";

const PIP_PREFERENCES = Object.freeze(["standby", "look-around", "repair-light", "adjust-antenna"]);

export function CreateWorldIdentity(worldSeed) {
  const stationRandom = CreateRandom(DeriveSeed(worldSeed, "station-identity-v1"));
  const visitorRandom = CreateRandom(DeriveSeed(worldSeed, "visitor-identity-v2"));
  const robotRandom = CreateRandom(DeriveSeed(worldSeed, "robot-identity-v2"));

  return Object.freeze({
    station: Object.freeze({
      orangeHueShift: stationRandom() * 0.06 - 0.03,
      panelTilt: stationRandom() * 0.18 - 0.09,
      tankCount: 2 + Math.floor(stationRandom() * 2),
      dishDirection: stationRandom() < 0.5 ? -1 : 1,
    }),
    visitor: Object.freeze({
      colorShift: visitorRandom() * 0.08 - 0.04,
      accentWarmth: visitorRandom(),
      finStyle: visitorRandom() < 0.5 ? "twin" : "single",
    }),
    robot: Object.freeze({
      favoriteAmbientJob: Pick(robotRandom, PIP_PREFERENCES),
      headQuirk: robotRandom() * 0.18 + 0.08,
    }),
  });
}
