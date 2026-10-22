import * as THREE from './vendor/three.module.js';
import { BuildInspectionDrone } from './phantom-renderer.js';
import { BuildConstructionDrone } from './seasonal-service-deck.js';
import { ThanksgivingActors, Ease } from './thanksgiving.js';

const material=(color,emissive=0)=>new THREE.MeshStandardMaterial({color,emissive,
  emissiveIntensity:1,roughness:.7,metalness:.12,flatShading:true});
function box(root,size,position,mat) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);
  mesh.position.set(...position); root.add(mesh); return mesh;
}
function cylinder(root,radius,height,position,mat) {
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,8),mat);
  mesh.position.set(...position); root.add(mesh); return mesh;
}

// Fixed-length two-link reach, authored in station space. No physics state.
export function HolidayReach(scene,arm,target,weight) {
  if(weight<=0)return;
  const s=scene.holidayReachScratch ||= {target:new THREE.Vector3(),direction:new THREE.Vector3(),bend:new THREE.Vector3(),
    upper:new THREE.Vector3(),lower:new THREE.Vector3(),base:new THREE.Vector3(),q:new THREE.Quaternion(),e:new THREE.Quaternion(),inv:new THREE.Quaternion()};
  s.target.fromArray(target);scene.station.localToWorld(s.target);scene.robot.worldToLocal(s.target);s.target.sub(arm.shoulder.position);
  const a=arm.elbow.position.length(),b=arm.hand.position.length();
  const distance=Math.max(.001,Math.min(a+b-.0001,s.target.length()));
  s.direction.copy(s.target).normalize();s.target.copy(s.direction).multiplyScalar(distance);
  const along=(a*a-b*b+distance*distance)/(2*distance);
  s.bend.set(0,-1,0).addScaledVector(s.direction,s.direction.y).normalize();
  s.upper.copy(s.direction).multiplyScalar(along).addScaledVector(s.bend,Math.sqrt(Math.max(0,a*a-along*along)));
  s.q.setFromUnitVectors(s.base.copy(arm.elbow.position).normalize(),s.lower.copy(s.upper).normalize());
  s.lower.copy(s.target).sub(s.upper).applyQuaternion(s.inv.copy(s.q).invert()).normalize();
  s.e.setFromUnitVectors(s.base.copy(arm.hand.position).normalize(),s.lower);
  arm.shoulder.quaternion.slerp(s.q,weight);arm.elbow.quaternion.slerp(s.e,weight);
}
export class HolidayVisual {
  constructor(scene) {
    this.scene=scene;
    this.root=new THREE.Group(); this.root.name='thanksgiving-advent'; scene.station.add(this.root);
    const blue=material(0x305674),gold=material(0xc59b51),teal=material(0x28565a),cream=material(0xd5caa8);
    const glow=material(0xffd18a,0xe5993d);
    this.table=new THREE.Group(); this.table.position.set(-5.35,0,2.02); this.root.add(this.table);
    box(this.table,[1.05,.08,.62],[0,.12,0],gold);
    box(this.table,[.92,.025,.52],[0,.175,0],teal);
    for(const x of [-.4,.4]) for(const z of [-.22,.22]) box(this.table,[.06,.51,.06],[x,-.175,z],teal);
    this.harvest=new THREE.Group();this.table.add(this.harvest);
    this.tray=new THREE.Group(); this.harvest.add(this.tray);
    box(this.tray,[.43,.035,.43],[.34,.19,0],cream);
    box(this.tray,[.15,.035,.04],[.34,.22,-.215],gold);
    for(const x of [-.31,0,.34]) {
      const parent=x===.34?this.tray:this.harvest;
      cylinder(parent,.09,.035,[x,.22,0],gold);
      cylinder(parent,.055,.13,[x,.3,0],teal);
      cylinder(parent,.045,.025,[x,.38,0],glow);
    }
    this.lantern=new THREE.Group();this.harvest.add(this.lantern);
    cylinder(this.lantern,.08,.035,[-.12,.23,-.23],gold);
    cylinder(this.lantern,.055,.19,[-.12,.34,-.23],glow);
    cylinder(this.lantern,.085,.035,[-.12,.45,-.23],gold);
    this.advent=new THREE.Group();this.table.add(this.advent);
    cylinder(this.advent,.24,.035,[0,.2,0],blue);
    this.lamps=[];
    for(let i=0;i<4;i++) {
      const angle=i*Math.PI/2+Math.PI/4,x=.17*Math.cos(angle),z=.17*Math.sin(angle);
      cylinder(this.advent,.05,.11,[x,.265,z],blue);
      cylinder(this.advent,.054,.025,[x,.32,z],gold);
      const lamp=cylinder(this.advent,.034,.055,[x,.36,z],material(0x9c865c));
      this.lamps.push(lamp);
    }
    this.star=new THREE.Group();this.star.position.set(0,.45,0);this.advent.add(this.star);
    for(const rotation of [0,Math.PI/2]) {
      const ray=box(this.star,[.035,.22,.035],[0,0,0],glow);ray.rotation.z=rotation;
    }
    this.construction=BuildConstructionDrone({window:glow},gold,teal,glow);
    this.inspection=BuildInspectionDrone();this.root.add(this.construction,this.inspection);
    this.fill=new THREE.PointLight(0xffd49b,1.2,4,2);this.fill.position.set(-5.3,1.5,2);this.root.add(this.fill);
  }
  update(state) {
    const h=state.holiday,story=state.thanksgiving;
    this.root.visible=Boolean(h && state.seasonal?.serviceDeck?.ready && (h.gathering||h.adventWeek||h.christmasHandoff||story));
    if(!this.root.visible)return;
    this.construction.visible=this.inspection.visible=Boolean(story);
    const advent=!story && (h.adventWeek>0||h.christmasHandoff);
    this.harvest.visible=!advent || h.transition<1;
    // Harvest tray retracts below the tabletop; the four-light tray rises in
    // its place. Calendar-derived, so missed mornings never replay a story.
    this.harvest.position.y=advent?-.48*Ease(h.transition):0;
    this.harvest.scale.setScalar(advent?1-Ease(h.transition):1);
    this.advent.visible=advent;
    this.advent.position.y=advent?-.3*(1-Ease(h.transition)):0;
    this.star.visible=h.christmasHandoff;
    this.lamps.forEach((lamp,i)=>{
      const lit=i<h.adventWeek||h.christmasHandoff;
      lamp.material.color.setHex(lit?0xffd48a:0x58738b);
      lamp.material.emissive.setHex(lit?0xd9a653:0);
      lamp.material.emissiveIntensity=lit?.7:0;
    });
    this.tray.position.x=h.preparing?0:.38;
    this.lantern.position.z=0;
    if(!story)return;
    const a=ThanksgivingActors(story.elapsed,this.scene.robotHome.toArray());
    this.tray.position.x=a.tray;
    this.lantern.position.z=a.lanternNudge;
    this.construction.position.fromArray(a.construction);this.construction.position.y+=a.bob;
    this.inspection.position.fromArray(a.inspection);this.inspection.position.y-=a.bob;
    this.construction.rotation.set(0,a.constructionYaw,.04*Math.sin(story.elapsed)*a.welcome);
    this.inspection.rotation.set(.06*Math.sin(story.elapsed*1.5)*a.welcome,a.inspectionYaw,0);
    const s=this.scene;
    s.robot.position.fromArray(a.pip);s.robot.rotation.set(.08*a.reach,a.yaw,0);
    s.robotHead.rotation.set(a.headPitch,a.headYaw,-.08*a.welcome);
    s.robotEye.scale.set(1+.08*a.welcome,1-.12*a.reach,1);
    s.robotTool.visible=false;
    for(const arm of s.robotArms) {
      arm.shoulder.rotation.set(-.6*a.reach,0,arm.side*(.16+.8*a.armWave));
      arm.elbow.rotation.set(-.3*a.reach,0,arm.side*.3*a.welcome);
    }
    HolidayReach(s,s.robotArms[0],[-5.47,.32,1.79+a.lanternNudge],a.lanternContact);
    HolidayReach(s,s.robotArms[1],[-5.01+a.tray,.22,1.805],a.trayContact);
  }
}
