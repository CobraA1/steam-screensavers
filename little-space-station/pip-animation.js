import { PreviousPipPose, ResolvePipPose } from "./pip-behavior.js";

function Clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function Smooth(value) { const t = Clamp01(value); return t * t * (3 - 2 * t); }
function Mix(first, second, amount) { return first + (second - first) * amount; }

const BASE_POSE = Object.freeze({
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  bodyPitch: 0,
  bodyLean: 0,
  lift: 0,
  leftShoulderZ: -0.1,
  leftShoulderX: 0,
  leftShoulderY: 0,
  leftElbowZ: 0,
  leftElbowX: 0,
  rightShoulderZ: 0.1,
  rightShoulderX: 0,
  rightShoulderY: 0,
  rightElbowZ: 0,
  rightElbowX: 0,
  eyeWidth: 1,
  eyeHeight: 1,
  tool: 0,
});

function Pose(values) { return Object.freeze({ ...BASE_POSE, ...values }); }

const POSES = Object.freeze({
  standby: Pose({ headYaw: -0.08, headPitch: 0.04, leftShoulderZ: -0.16, rightShoulderZ: 0.16 }),
  "settle-charge": Pose({ headYaw: -0.04, headPitch: 0.15, bodyPitch: 0.08, lift: -0.025, leftShoulderZ: -0.24, rightShoulderZ: 0.24, eyeHeight: 0.62 }),
  charging: Pose({ headYaw: -0.03, headPitch: 0.23, bodyPitch: 0.11, lift: -0.05, leftShoulderZ: -0.12, rightShoulderZ: 0.12, eyeWidth: 0.82, eyeHeight: 0.22 }),
  "dream-antenna": Pose({ headYaw: -0.03, headPitch: 0.26, bodyPitch: 0.11, lift: -0.05, leftShoulderZ: -0.12, rightShoulderZ: 0.12, eyeWidth: 0.8, eyeHeight: 0.16 }),
  observe: Pose({ headYaw: 0.52, headPitch: -0.1, bodyLean: -0.025, leftShoulderZ: -0.3, rightShoulderZ: 0.22, eyeWidth: 1.12 }),
  "routine-inspection": Pose({ headYaw: 0.3, headPitch: -0.22, bodyPitch: 0.06, leftShoulderZ: -0.54, leftShoulderX: -0.2, leftElbowZ: -0.22, rightShoulderZ: 0.2 }),
  notice: Pose({ headYaw: 0.42, headPitch: -0.18, bodyLean: -0.04, leftShoulderZ: -0.35, rightShoulderZ: 0.35, eyeHeight: 1.16 }),
  "notice-fault": Pose({ headYaw: 0.5, headPitch: -0.2, bodyPitch: -0.05, leftShoulderZ: -0.48, rightShoulderZ: 0.48, eyeHeight: 1.25 }),
  "antenna-notice": Pose({ headYaw: 0.55, headPitch: -0.18, bodyLean: -0.05, leftShoulderZ: -0.38, rightShoulderZ: 0.42, eyeHeight: 1.28 }),
  travel: Pose({ headPitch: -0.04, bodyPitch: 0.04, leftShoulderZ: -0.24, rightShoulderZ: 0.24 }),
  prepare: Pose({ headYaw: 0.28, headPitch: -0.14, leftShoulderZ: -0.4, rightShoulderZ: 0.26 }),
  "prepare-cargo": Pose({ headYaw: 0.3, headPitch: 0.12, bodyPitch: 0.04, leftShoulderZ: -0.5, rightShoulderZ: 0.5, eyeWidth: 1.1 }),
  "inspect-light": Pose({ headYaw: 0.28, headPitch: -0.28, headRoll: -0.12, bodyPitch: 0.1, leftShoulderZ: -0.72, leftShoulderX: -0.28, leftElbowZ: -0.36, rightShoulderZ: 0.24 }),
  "prepare-repair-tool": Pose({ headYaw: 0.2, headPitch: -0.18, leftShoulderZ: -0.74, leftShoulderX: -0.5, leftElbowZ: -0.42, rightShoulderZ: 0.48, rightShoulderX: -0.18, tool: 1 }),
  "repair-light": Pose({ headYaw: 0.16, headPitch: -0.24, bodyPitch: 0.08, leftShoulderZ: -1.02, leftShoulderX: -0.62, leftElbowZ: -0.52, rightShoulderZ: 0.64, rightShoulderX: -0.28, rightElbowZ: 0.3, tool: 1 }),
  "inspect-antenna": Pose({ headYaw: 0.14, headPitch: -0.48, headRoll: 0.1, bodyPitch: -0.05, leftShoulderZ: -0.42, rightShoulderZ: 0.82, rightShoulderX: -0.22, rightElbowZ: 0.34 }),
  "inspect-stubborn-antenna": Pose({ headYaw: 0.18, headPitch: -0.52, headRoll: 0.15, bodyPitch: -0.09, leftShoulderZ: -0.55, rightShoulderZ: 0.95, rightShoulderX: -0.3, rightElbowZ: 0.4, eyeWidth: 1.14 }),
  "prepare-antenna-tool": Pose({ headPitch: -0.34, leftShoulderZ: -0.96, leftShoulderX: -0.5, leftElbowZ: -0.3, rightShoulderZ: 0.7, rightShoulderX: -0.3, tool: 1 }),
  "adjust-antenna": Pose({ headPitch: -0.42, bodyPitch: -0.04, leftShoulderZ: -1.24, leftShoulderX: -0.48, leftElbowZ: -0.38, rightShoulderZ: 1.12, rightShoulderX: -0.42, rightElbowZ: 0.42, tool: 1 }),
  "first-antenna-repair": Pose({ headPitch: -0.44, bodyPitch: -0.08, leftShoulderZ: -1.16, leftShoulderX: -0.52, leftElbowZ: -0.44, rightShoulderZ: 1.02, rightShoulderX: -0.36, rightElbowZ: 0.34, tool: 1 }),
  "false-relief": Pose({ headYaw: -0.14, headPitch: 0.03, bodyPitch: -0.04, lift: 0.035, leftShoulderZ: -0.32, rightShoulderZ: 0.32, eyeWidth: 1.2 }),
  "startled-antenna": Pose({ headYaw: 0.2, headPitch: 0.32, bodyPitch: 0.28, bodyLean: -0.12, lift: -0.09, leftShoulderZ: -0.95, leftShoulderX: -0.38, rightShoulderZ: 0.95, rightShoulderX: -0.38, eyeWidth: 1.36, eyeHeight: 0.76 }),
  "install-repair-plate": Pose({ headPitch: -0.5, bodyPitch: -0.09, leftShoulderZ: -1.28, leftShoulderX: -0.58, leftElbowZ: -0.48, rightShoulderZ: 1.2, rightShoulderX: -0.45, rightElbowZ: 0.46, tool: 1 }),
  "verify-stubborn-antenna": Pose({ headYaw: -0.22, headPitch: -0.4, headRoll: -0.1, leftShoulderZ: -0.3, rightShoulderZ: 0.48, eyeWidth: 1.18 }),
  "story-satisfied": Pose({ headPitch: 0.06, bodyPitch: -0.04, lift: 0.045, leftShoulderZ: -0.42, rightShoulderZ: 0.42, eyeWidth: 1.2, eyeHeight: 1.12 }),
  "phantom-glimpse": Pose({ headYaw: 0.62, headPitch: -0.2, headRoll: 0.08, bodyLean: -0.05, leftShoulderZ: -0.42, rightShoulderZ: 0.42, eyeWidth: 1.24, eyeHeight: 1.2 }),
  "phantom-investigate": Pose({ headYaw: 0.28, headPitch: -0.16, bodyPitch: 0.06, leftShoulderZ: -0.38, rightShoulderZ: 0.28, eyeWidth: 1.18 }),
  "phantom-search": Pose({ headYaw: -0.46, headPitch: -0.25, headRoll: -0.1, bodyPitch: 0.08, leftShoulderZ: -0.58, rightShoulderZ: 0.38, eyeWidth: 1.14 }),
  "phantom-reveal": Pose({ headPitch: -0.34, headRoll: 0.12, bodyPitch: 0.05, leftShoulderZ: -0.7, rightShoulderZ: 0.7, eyeWidth: 1.28, eyeHeight: 1.16 }),
  "phantom-untangle": Pose({ headPitch: -0.28, bodyPitch: 0.1, leftShoulderZ: -1.02, leftShoulderX: -0.7, leftElbowZ: -0.36, rightShoulderZ: 1.02, rightShoulderX: -0.7, rightElbowZ: 0.36, eyeWidth: 1.1 }),
  "phantom-wave": Pose({ headYaw: 0.38, headPitch: -0.24, leftShoulderZ: -0.25, rightShoulderZ: 1.35, rightShoulderX: -0.2, rightElbowZ: 0.45, eyeWidth: 1.2 }),
  "phantom-trail": Pose({ headYaw: -0.12, headPitch: -0.02, bodyPitch: 0.04, leftShoulderZ: -0.24, rightShoulderZ: 0.24 }),
  "phantom-surprise": Pose({ headYaw: -0.65, headPitch: 0.25, headRoll: -0.14, bodyPitch: 0.2, bodyLean: -0.1, lift: -0.06, leftShoulderZ: -0.92, rightShoulderZ: 0.92, eyeWidth: 1.36, eyeHeight: 0.78 }),
  "remembrance-approach": Pose({ headYaw: 0.18, headPitch: -0.12, bodyPitch: 0.03, leftShoulderZ: -0.18, rightShoulderZ: 0.18, eyeWidth: 1.02, eyeHeight: 0.92 }),
  "remembrance-prepare": Pose({ headPitch: -0.28, bodyPitch: 0.07, leftShoulderZ: -0.72, leftShoulderX: -0.46, leftElbowZ: -0.2, rightShoulderZ: 0.72, rightShoulderX: -0.46, rightElbowZ: 0.2, eyeWidth: 0.98, eyeHeight: 0.88 }),
  "remembrance-activate": Pose({ headPitch: -0.24, bodyPitch: 0.04, leftShoulderZ: -0.34, rightShoulderZ: 1.02, rightShoulderX: -0.48, rightElbowZ: 0.32, eyeWidth: 1.02, eyeHeight: 0.9 }),
  "remembrance-stillness": Pose({ headPitch: 0.18, bodyPitch: 0.05, lift: -0.018, leftShoulderZ: -0.16, leftShoulderX: -0.18, rightShoulderZ: 0.16, rightShoulderX: -0.18, eyeWidth: 0.86, eyeHeight: 0.54 }),
  "remembrance-return": Pose({ headPitch: 0.05, leftShoulderZ: -0.18, rightShoulderZ: 0.18, eyeWidth: 0.94, eyeHeight: 0.82 }),
  "synchronize-array": Pose({ headYaw: 0.12, headPitch: -0.38, leftShoulderZ: -1.06, leftShoulderX: -0.42, leftElbowZ: -0.3, rightShoulderZ: 0.92, rightShoulderX: -0.3, rightElbowZ: 0.28, eyeWidth: 1.15, tool: 1 }),
  "inspect-cargo": Pose({ headPitch: 0.34, headRoll: -0.12, bodyPitch: 0.16, leftShoulderZ: -0.45, leftShoulderX: -0.42, rightShoulderZ: 0.45, rightShoulderX: -0.42, eyeWidth: 1.12 }),
  "grasp-cargo": Pose({ headPitch: 0.2, bodyPitch: 0.14, leftShoulderZ: -0.68, leftShoulderX: -0.86, leftElbowZ: 0.28, rightShoulderZ: 0.68, rightShoulderX: -0.86, rightElbowZ: -0.28 }),
  "carry-cargo": Pose({ headPitch: 0.1, bodyPitch: 0.05, leftShoulderZ: -0.5, leftShoulderX: -1.02, leftElbowZ: 0.38, rightShoulderZ: 0.5, rightShoulderX: -1.02, rightElbowZ: -0.38 }),
  "stow-cargo": Pose({ headPitch: 0.2, bodyPitch: 0.13, leftShoulderZ: -0.6, leftShoulderX: -0.92, leftElbowZ: 0.24, rightShoulderZ: 0.6, rightShoulderX: -0.92, rightElbowZ: -0.24 }),
  "verify-light": Pose({ headYaw: -0.24, headPitch: -0.12, headRoll: 0.12, leftShoulderZ: -0.35, rightShoulderZ: 0.22, eyeWidth: 1.14 }),
  "verify-antenna": Pose({ headYaw: -0.28, headPitch: -0.35, headRoll: -0.08, leftShoulderZ: -0.28, rightShoulderZ: 0.42, eyeWidth: 1.14 }),
  "verify-cargo": Pose({ headYaw: -0.22, headPitch: 0.12, headRoll: 0.08, leftShoulderZ: -0.3, rightShoulderZ: 0.3, eyeWidth: 1.1 }),
  satisfied: Pose({ headPitch: 0.08, bodyPitch: -0.03, lift: 0.05, leftShoulderZ: -0.45, rightShoulderZ: 0.45, eyeWidth: 1.22, eyeHeight: 1.14 }),
  return: Pose({ headYaw: -0.08, headPitch: 0.02, leftShoulderZ: -0.2, rightShoulderZ: 0.2 }),
});
const CARGO_DROP_STAGES = new Set(["stow-cargo", "verify", "react-success"]);
const HOME_STAGES = new Set(["standby", "observe", "inspect-routine", "notice", "prepare"]);
const MANIPULATION_STAGES = new Set(["repair", "adjust", "synchronize"]);
const FOCUSED_STAGES = new Set(["repair", "adjust", "synchronize", "retrieve-cargo", "deliver-cargo", "stow-cargo", "collect-decoration", "carry-decoration", "install-decoration"]);

function TaskYaw(taskId) {
  // The equipment light is mounted on the station's +Z face. This yaw lets Pip
  // arrive in front of it and naturally turn back toward the service panel.
  if (taskId === "repair-light") return 2.32;
  // Antenna jobs are staged on the +Z side of the mast; face back toward the
  // dish rather than outward into space. Travel and return interpolate to it.
  if (taskId === "adjust-antenna" || taskId === "survey-sync") return 2.8;
  if (taskId === "stubborn-antenna") return 2.8;
  if (taskId === "cargo-transfer" || taskId === "dispatch-exchange" || taskId === "seasonal-cargo") return 0.5;
  if (taskId === "seasonal-install") return 2.55;
  if (taskId === "seasonal-cleanup") return 2.55;
  if (taskId === "seasonal-oddity") return 2.32;
  // The commons fixture is to Pip's +X/+Z; approach and return ease into this heading.
  if (taskId === "lights-of-remembrance") return 1.23;
  if (taskId === "watch-arrival") return 0.68;
  return -0.16;
}

function SetRobotPosition(scene, taskId, stage, progress) {
  if (taskId === "charging" || taskId === "dream-antenna" || taskId === "dream-phantom") {
    scene.robot.position.copy(scene.robotHome);
    scene.robot.rotation.y = -0.16;
    scene.robot.rotation.z = 0;
    return false;
  }
  if (taskId === "stubborn-antenna") {
    const worksite = scene.robotTaskTargets[taskId];
    const safe = scene.robotAntennaSafe;
    let motion = false;
    if (stage === "notice-antenna") {
      scene.robot.position.copy(scene.robotHome);
      scene.robot.rotation.y = Mix(-0.16, 2.8, Smooth(progress));
    } else if (stage === "investigate-stubborn-antenna") {
      scene.robot.position.lerpVectors(scene.robotHome, worksite, Smooth(progress));
      scene.robot.rotation.y = Mix(-0.16, 2.8, Smooth(progress));
      motion = true;
    } else if (stage === "runaway-spin") {
      const recoil = Smooth(Math.min(1, progress * 2.6));
      scene.robot.position.lerpVectors(worksite, safe, recoil);
      scene.robot.rotation.y = Mix(2.8, 2.25, recoil);
      motion = progress < 0.48;
    } else if (stage === "install-repair-plate") {
      const returnAmount = Smooth(Math.min(1, progress * 2.4));
      scene.robot.position.lerpVectors(safe, worksite, returnAmount);
      scene.robot.rotation.y = Mix(2.25, 2.8, returnAmount);
      motion = progress < 0.42;
    } else if (stage === "story-return") {
      scene.robot.position.lerpVectors(worksite, scene.robotHome, Smooth(progress));
      scene.robot.rotation.y = Mix(2.8, -0.16, Smooth(progress));
      motion = true;
    } else {
      scene.robot.position.copy(worksite);
      scene.robot.rotation.y = 2.8;
    }
    if (motion) {
      const stride = Math.sin(progress * Math.PI * 4);
      scene.robot.position.y += Math.abs(stride) * 0.045;
      scene.robot.rotation.z = stride * 0.045;
    } else scene.robot.rotation.z = 0;
    return motion;
  }
  if (taskId === "phantom-visitor") {
    const work = scene.robotPhantomWork;
    const search = scene.robotPhantomSearch;
    let motion = false;
    if (stage === "phantom-glimpse") {
      scene.robot.position.copy(scene.robotHome);
      scene.robot.rotation.y = Mix(-0.16, 2.35, Smooth(progress));
    } else if (stage === "phantom-investigate") {
      scene.robot.position.lerpVectors(scene.robotHome, work, Smooth(progress));
      scene.robot.rotation.y = Mix(-0.16, 2.45, Smooth(progress));
      motion = true;
    } else if (stage === "phantom-search") {
      const sweep = progress < 0.5 ? Smooth(progress * 2) : Smooth((1 - progress) * 2);
      scene.robot.position.lerpVectors(work, search, sweep);
      scene.robot.rotation.y = 2.45 + Math.sin(progress * Math.PI * 2) * 0.55;
      motion = true;
    } else if (stage === "phantom-trail") {
      scene.robot.position.lerpVectors(work, scene.robotHome, Smooth(progress));
      scene.robot.rotation.y = Mix(2.45, -0.16, Smooth(progress));
      motion = true;
    } else if (stage === "phantom-surprise") {
      scene.robot.position.copy(scene.robotHome);
      const turn = Smooth(Math.min(1, progress * 2.5));
      scene.robot.rotation.y = Mix(-0.16, -1.35, turn);
      scene.robot.position.x -= Math.sin(progress * Math.PI) * 0.08;
    } else {
      scene.robot.position.copy(work);
      scene.robot.rotation.y = 2.45;
    }
    if (motion) {
      const stride = Math.sin(progress * Math.PI * 4);
      scene.robot.position.y += Math.abs(stride) * 0.045;
      scene.robot.rotation.z = stride * 0.045;
    } else scene.robot.rotation.z = 0;
    return motion;
  }
  if (taskId === "lights-of-remembrance") {
    const work = scene.robotRemembranceWork;
    let motion = false;
    if (stage === "remembrance-approach") {
      scene.robot.position.lerpVectors(scene.robotHome, work, Smooth(progress));
      scene.robot.rotation.y = Mix(-0.16, TaskYaw(taskId), Smooth(progress));
      motion = true;
    } else if (stage === "remembrance-return") {
      scene.robot.position.lerpVectors(work, scene.robotHome, Smooth(progress));
      scene.robot.rotation.y = Mix(TaskYaw(taskId), -0.16, Smooth(progress));
      motion = true;
    } else {
      scene.robot.position.copy(work);
      scene.robot.rotation.y = TaskYaw(taskId);
    }
    if (motion) {
      const stride = Math.sin(progress * Math.PI * 3);
      scene.robot.position.y += Math.abs(stride) * 0.025;
      scene.robot.rotation.z = stride * 0.025;
    } else scene.robot.rotation.z = 0;
    return motion;
  }
  if (taskId === "seasonal-install") {
    const supply = scene.robotCargoDrop;
    const install = scene.robotSeasonalInstall;
    let motion = false;
    if (stage === "travel-to-supplies") {
      scene.robot.position.lerpVectors(scene.robotHome, supply, Smooth(progress));
      scene.robot.rotation.y = Mix(-0.16, 0.3, Smooth(progress));
      motion = true;
    } else if (stage === "carry-decoration") {
      scene.robot.position.lerpVectors(supply, install, Smooth(progress));
      scene.robot.rotation.y = Mix(0.3, TaskYaw(taskId), Smooth(progress));
      motion = true;
    } else if (stage === "return") {
      scene.robot.position.lerpVectors(install, scene.robotHome, Smooth(progress));
      scene.robot.rotation.y = Mix(TaskYaw(taskId), -0.16, Smooth(progress));
      motion = true;
    } else if (stage === "notice-decor") {
      scene.robot.position.copy(scene.robotHome);
      scene.robot.rotation.y = Mix(-0.16, 0.3, Smooth(progress));
    } else if (stage === "collect-decoration") {
      scene.robot.position.copy(supply);
      scene.robot.rotation.y = 0.3;
    } else {
      scene.robot.position.copy(install);
      scene.robot.rotation.y = TaskYaw(taskId);
    }
    if (motion) {
      const stride = Math.sin(progress * Math.PI * 4);
      scene.robot.position.y += Math.abs(stride) * 0.045;
      scene.robot.rotation.z = stride * 0.045;
    } else scene.robot.rotation.z = 0;
    return motion;
  }
  if (taskId === "seasonal-cleanup") {
    const install = scene.robotSeasonalInstall;
    const storage = scene.robotCargoDrop;
    let motion = false;
    if (stage === "travel-to-decoration") {
      scene.robot.position.lerpVectors(scene.robotHome, install, Smooth(progress));
      scene.robot.rotation.y = Mix(-0.16, TaskYaw(taskId), Smooth(progress));
      motion = true;
    } else if (stage === "carry-away") {
      scene.robot.position.lerpVectors(install, storage, Smooth(progress));
      scene.robot.rotation.y = Mix(TaskYaw(taskId), 0.3, Smooth(progress));
      motion = true;
    } else if (stage === "stow-decoration") {
      scene.robot.position.copy(storage);
      scene.robot.rotation.y = 0.3;
    } else if (stage === "return") {
      scene.robot.position.lerpVectors(storage, scene.robotHome, Smooth(progress));
      scene.robot.rotation.y = Mix(0.3, -0.16, Smooth(progress));
      motion = true;
    } else if (stage === "notice-decor") {
      scene.robot.position.copy(scene.robotHome);
      scene.robot.rotation.y = Mix(-0.16, TaskYaw(taskId), Smooth(progress));
    } else {
      scene.robot.position.copy(install);
      scene.robot.rotation.y = TaskYaw(taskId);
    }
    if (motion) {
      const stride = Math.sin(progress * Math.PI * 4);
      scene.robot.position.y += Math.abs(stride) * 0.045;
      scene.robot.rotation.z = stride * 0.045;
    } else scene.robot.rotation.z = 0;
    return motion;
  }
  if (taskId === "seasonal-oddity") {
    const worksite = scene.robotTaskTargets["repair-light"];
    if (stage === "notice-oddity") {
      scene.robot.position.copy(scene.robotHome);
      scene.robot.rotation.y = Mix(-0.16, TaskYaw(taskId), Smooth(progress));
      scene.robot.rotation.z = 0;
      return false;
    }
    if (stage === "return") {
      scene.robot.position.lerpVectors(worksite, scene.robotHome, Smooth(progress));
      scene.robot.rotation.y = Mix(TaskYaw(taskId), -0.16, Smooth(progress));
    } else if (stage === "inspect-oddity") {
      scene.robot.position.lerpVectors(scene.robotHome, worksite, Smooth(Math.min(1, progress * 2)));
      scene.robot.rotation.y = Mix(-0.16, TaskYaw(taskId), Smooth(Math.min(1, progress * 2)));
    } else {
      scene.robot.position.copy(worksite);
      scene.robot.rotation.y = TaskYaw(taskId);
    }
    const stride = Math.sin(progress * Math.PI * 4);
    scene.robot.position.y += Math.abs(stride) * 0.025;
    scene.robot.rotation.z = stride * 0.025;
    return true;
  }
  const target = scene.robotTaskTargets[taskId] || scene.robotHome;
  const cargoTask = taskId === "cargo-transfer" || taskId === "dispatch-exchange" || taskId === "seasonal-cargo";
  const traveling = stage.startsWith("travel-to-");
  const returningToCargo = stage === "return-to-cargo";
  const returning = stage === "return";
  const delivering = stage === "deliver-cargo";
  const atCargoDrop = cargoTask && CARGO_DROP_STAGES.has(stage);
  const taskYaw = TaskYaw(taskId);
  let motion = false;

  if (returningToCargo) {
    scene.robot.position.lerpVectors(scene.robotCargoDrop, scene.robotWork, Smooth(progress));
    scene.robot.rotation.y = Mix(0.3, taskYaw, Smooth(progress));
    motion = true;
  } else if (traveling) {
    scene.robot.position.lerpVectors(scene.robotHome, target, Smooth(progress));
    scene.robot.rotation.y = Mix(-0.16, taskYaw, Smooth(progress));
    motion = true;
  } else if (returning) {
    const returnStart = cargoTask ? scene.robotCargoDrop : target;
    scene.robot.position.lerpVectors(returnStart, scene.robotHome, Smooth(progress));
    scene.robot.rotation.y = Mix(cargoTask ? 0.3 : taskYaw, -0.16, Smooth(progress));
    motion = true;
  } else if (delivering) {
    scene.robot.position.lerpVectors(scene.robotWork, scene.robotCargoDrop, Smooth(progress));
    scene.robot.rotation.y = Mix(taskYaw, 0.3, Smooth(progress));
    motion = true;
  } else if (atCargoDrop || stage === "package-confirm") {
    scene.robot.position.copy(scene.robotCargoDrop);
    scene.robot.rotation.y = 0.3;
  } else if (HOME_STAGES.has(stage)) {
    scene.robot.position.copy(scene.robotHome);
    scene.robot.rotation.y = taskId === "watch-arrival" ? TaskYaw(taskId) : -0.16;
  } else {
    scene.robot.position.copy(target);
    scene.robot.rotation.y = taskYaw;
  }

  if (motion) {
    const stride = Math.sin(progress * Math.PI * 4);
    scene.robot.position.y += Math.abs(stride) * 0.045;
    scene.robot.rotation.z = stride * 0.045;
  } else {
    scene.robot.rotation.z = 0;
  }
  return motion;
}

function ApplyArmPose(arm, prefix, from, to, amount, workingMotion) {
  const shoulderZ = Mix(from[prefix + "ShoulderZ"], to[prefix + "ShoulderZ"], amount);
  const shoulderX = Mix(from[prefix + "ShoulderX"], to[prefix + "ShoulderX"], amount);
  const shoulderY = Mix(from[prefix + "ShoulderY"], to[prefix + "ShoulderY"], amount);
  const elbowZ = Mix(from[prefix + "ElbowZ"], to[prefix + "ElbowZ"], amount);
  const elbowX = Mix(from[prefix + "ElbowX"], to[prefix + "ElbowX"], amount);
  arm.shoulder.rotation.set(shoulderX + workingMotion, shoulderY, shoulderZ);
  arm.elbow.rotation.set(elbowX - workingMotion * 0.7, 0, elbowZ + workingMotion * (arm.side < 0 ? -0.5 : 0.5));
}

export function UpdatePip(scene, state) {
  const taskId = state.pipTaskId || "standby";
  const stage = state.pipTaskStage || "standby";
  const progress = Clamp01(state.pipTaskProgress);
  const variant = Math.abs(Math.floor(state.pipGestureVariant || 0)) % 3;
  const poseName = ResolvePipPose(taskId, stage);
  const previousPoseName = taskId === "dream-antenna" || taskId === "dream-phantom" ? "charging" : PreviousPipPose(taskId, stage);
  const from = POSES[previousPoseName] || POSES.standby;
  const to = POSES[poseName] || POSES.standby;
  const blend = stage === "return" ? Smooth(progress) : Smooth(Math.min(1, progress * 2.4));
  const motion = SetRobotPosition(scene, taskId, stage, progress);

  let headYaw = Mix(from.headYaw, to.headYaw, blend);
  let headPitch = Mix(from.headPitch, to.headPitch, blend);
  let headRoll = Mix(from.headRoll, to.headRoll, blend);
  let bodyPitch = Mix(from.bodyPitch, to.bodyPitch, blend);
  let bodyLean = Mix(from.bodyLean, to.bodyLean, blend);
  let lift = Mix(from.lift, to.lift, blend);
  let eyeWidth = Mix(from.eyeWidth, to.eyeWidth, blend);
  let eyeHeight = Mix(from.eyeHeight, to.eyeHeight, blend);
  const stageEnvelope = Math.sin(progress * Math.PI);
  let workingMotion = 0;

  if (stage === "standby") {
    const idleCycle = (scene.elapsed + variant * 5.7) % 18;
    if (idleCycle > 11 && idleCycle < 13.4) {
      const gesture = Math.sin((idleCycle - 11) / 2.4 * Math.PI);
      headYaw += gesture * (variant === 1 ? -0.34 : 0.28);
      headRoll += gesture * 0.09;
    }
    if (idleCycle > 5.1 && idleCycle < 5.24) eyeHeight *= 0.16;
  } else if (stage === "observe") {
    headYaw += Math.sin(progress * Math.PI * 2) * 0.18;
    headPitch += Math.sin(progress * Math.PI) * -0.08;
  } else if (stage === "inspect-routine") {
    headYaw += Math.sin(progress * Math.PI * 2) * 0.28;
    headRoll += Math.sin(progress * Math.PI * 4) * 0.06;
  } else if (stage === "charging" || stage === "dream-antenna" || stage === "dream-phantom") {
    const pulse = 0.5 + 0.5 * Math.sin(scene.elapsed * (stage.startsWith("dream-") ? 1.5 : 1.05));
    lift -= 0.012 + pulse * 0.009;
    headRoll += stage.startsWith("dream-") ? Math.sin(scene.elapsed * 0.65) * 0.035 : 0;
  } else if (poseName === "notice-fault" && variant === 2) {
    bodyPitch -= stageEnvelope * 0.13;
    lift += stageEnvelope * 0.055;
    eyeHeight += stageEnvelope * 0.22;
  } else if (poseName.startsWith("inspect-") || poseName.startsWith("verify-")) {
    headRoll += stageEnvelope * (variant === 0 ? -0.08 : 0.08);
  }

  if (MANIPULATION_STAGES.has(stage) || stage === "first-antenna-repair" || stage === "install-repair-plate" || stage === "remembrance-prepare" || stage === "remembrance-activate") {
    workingMotion = Math.sin(progress * Math.PI * 6 + variant * 0.7) * stageEnvelope * 0.075;
  }
  if (stage === "react-success") {
    headPitch += Math.sin(progress * Math.PI * 2) * 0.13;
    lift += stageEnvelope * (variant === 1 ? 0.065 : 0.035);
    bodyLean += Math.sin(progress * Math.PI * 2) * 0.035;
    eyeWidth += stageEnvelope * 0.16;
  }
  if (taskId === "stubborn-antenna" && stage === "false-relief") {
    headPitch += Math.sin(progress * Math.PI) * -0.08;
    lift += Math.sin(progress * Math.PI) * 0.025;
  }
  if (taskId === "stubborn-antenna" && stage === "runaway-spin") {
    const recoil = Math.sin(Math.min(1, progress * 2.6) * Math.PI);
    if (variant === 0) { bodyPitch += recoil * 0.08; headPitch += recoil * 0.12; }
    if (variant === 1) { bodyLean -= recoil * 0.1; lift += recoil * 0.04; }
    if (variant === 2) { bodyPitch += recoil * 0.13; headRoll += recoil * 0.12; }
  }
  if (motion) bodyPitch += 0.035;

  scene.robot.position.y += lift;
  scene.robot.rotation.x = bodyPitch;
  scene.robot.rotation.z += bodyLean;
  scene.robotHead.rotation.set(headPitch, headYaw, headRoll);
  ApplyArmPose(scene.robotArms[0], "left", from, to, blend, workingMotion);
  ApplyArmPose(scene.robotArms[1], "right", from, to, blend, -workingMotion);

  scene.robotEye.scale.set(Math.max(0.35, eyeWidth), Math.max(0.12, eyeHeight), 1);
  const shadowBoost = scene.environmentArtificialBoost || 0;
  const successFlash = stage === "react-success" ? stageEnvelope : 0;
  const chargePulse = (stage === "charging" || stage.startsWith("dream-")) ? 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(scene.elapsed * 1.15)) : 1;
  scene.robotEyeMaterial.emissiveIntensity = (3.2 + shadowBoost * 2 + successFlash * 2.2) * chargePulse;
  scene.robotEyeLight.intensity = (0.35 + shadowBoost * 0.75 + successFlash * 0.45) * chargePulse;
  scene.robotStatusMaterial.emissiveIntensity = (1.35 + shadowBoost * 1.2 + successFlash * 2.4) * chargePulse;

  const toolAmount = Mix(from.tool, to.tool, blend);
  const toolActive = toolAmount > 0.05;
  scene.robotTool.visible = toolActive;
  if (toolActive) {
    const pulse = 0.76 + Math.sin(progress * Math.PI * 8 + variant) * 0.13 * stageEnvelope;
    scene.robotToolGlow.scale.setScalar(Math.max(0.58, pulse));
    scene.robotToolGlow.material.opacity = Math.min(1, 0.45 + toolAmount * 0.35 + shadowBoost * 0.14 + successFlash * 0.12);
  }

  scene.pipPoseName = poseName;
  scene.pipReactionName = stage.startsWith("dream-")
    ? "remembering"
    : stage === "charging" || stage === "settle-charge"
      ? "recharging"
      : stage === "react-success"
    ? "satisfied"
    : poseName === "notice-fault" && variant === 2
      ? "startled"
      : poseName.startsWith("inspect-")
        ? "curious"
        : poseName.startsWith("verify-")
          ? "checking"
          : FOCUSED_STAGES.has(stage)
            ? "focused"
            : "quiet";
}
