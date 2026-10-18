// Compatibility entry point. The simulation is separated from visual identity,
// while existing imports of world.js continue to work.
export {
  AMBIENT_JOBS,
  EVENT_CATALOG,
  EventDirector,
  PHASE_NAMES,
  SmoothStep,
  TrafficScheduler,
} from "./simulation-world.js";
export { CreateWorldIdentity } from "./station-identity.js";
