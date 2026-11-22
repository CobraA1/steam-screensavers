import * as THREE from './vendor/three.module.js';
import { WreathActors } from './advent-wreath.js';
import { Smooth } from './advent-activities.js';

export class AdventWreathVisual {
  constructor(scene) {
    this.scene = scene;
    this.point = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.center = new THREE.Vector3(-5.35, .62, 2.02);
  }
  update(state, reach) {
    const ceremony = state.wreathCeremony;
    if (!ceremony) return;
    const s = this.scene, a = WreathActors(ceremony, s.robotHome.toArray()), t = ceremony.elapsed;
    this.actors = a;
    // Meet the ordinary pose at both ends. UpdatePip reconstructs the baseline
    // first, so reverse seeking has no dependence on the previous frame.
    const weight = Smooth(t / 2) * (1 - Smooth((t - 30) / 2));
    s.robot.position.lerp(this.point.fromArray(a.pip), weight);
    s.robot.rotation.set(s.robot.rotation.x * (1 - weight),
      THREE.MathUtils.lerp(s.robot.rotation.y, a.yaw, weight), s.robot.rotation.z * (1 - weight));
    s.robotEye.scale.set(1 + .05 * a.pleased, 1 - .08 * a.pleased, 1);
    for (const arm of s.robotArms) {
      arm.shoulder.rotation.set(arm.shoulder.rotation.x * (1 - weight), arm.shoulder.rotation.y * (1 - weight),
        THREE.MathUtils.lerp(arm.shoulder.rotation.z, arm.side * .14, weight));
      arm.elbow.rotation.set(arm.elbow.rotation.x * (1 - weight), arm.elbow.rotation.y * (1 - weight), arm.elbow.rotation.z * (1 - weight));
    }
    s.robotTool.visible = a.tool;
    s.robotToolGlow.scale.setScalar(.17);
    s.robotToolGlow.material.opacity = .25;
    s.station.updateMatrixWorld(true);
    this.look.fromArray(a.contact);
    this.look.lerp(this.center, Smooth((t - 19) / 2));
    s.station.localToWorld(this.look); s.robot.worldToLocal(this.look); this.look.sub(s.robotHead.position);
    const yaw = THREE.MathUtils.clamp(Math.atan2(this.look.x, this.look.z), -.65, .65) * a.attention;
    const pitch = THREE.MathUtils.clamp(-Math.atan2(this.look.y, Math.hypot(this.look.x, this.look.z)), -.55, .55) * a.attention + a.nod;
    s.robotHead.rotation.set(THREE.MathUtils.lerp(s.robotHead.rotation.x, pitch, weight),
      THREE.MathUtils.lerp(s.robotHead.rotation.y, yaw, weight), THREE.MathUtils.lerp(s.robotHead.rotation.z, a.headRoll, weight));
    // Keep the elbow above the table and guide the existing tool to the wick.
    reach(s, s.robotArms[0], a.contact, a.reach, true, Math.PI);
    s.pipPoseName = 'advent-wreath-' + ceremony.beat;
    s.pipReactionName = t >= 19 && t < 24 ? (ceremony.week === 2 ? 'quiet-joy' : 'peaceful') : 'careful';
  }
}
