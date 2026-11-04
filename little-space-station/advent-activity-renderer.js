import * as THREE from './vendor/three.module.js';
import { AdventActors, ADVENT_SUPPLY, Smooth } from './advent-activities.js';
import { CHRISTMAS_TREE_POSITION as TREE } from './christmas-tree.js';

// Only the small supply locker is new geometry. Decorations remain their
// original mesh/instance throughout collection, travel, attachment and release.
export class AdventActivityVisual {
  constructor(scene,tree) {
    this.scene=scene;this.tree=tree;this.root=new THREE.Group();this.root.name='advent-work-locker';scene.station.add(this.root);
    this.root.position.fromArray(ADVENT_SUPPLY);
    const dark=scene.materials.dark,trim=scene.materials.orange;
    const box=(size,pos,mat,parent=this.root)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);parent.add(m);return m;};
    // Open-topped walls; the hinged cover actually conceals a staged parcel.
    box([.42,.045,.46],[0,.025,0],dark);
    for(const x of [-.195,.195])box([.03,1.04,.46],[x,.54,0],dark);
    for(const z of [-.215,.215])box([.36,1.04,.03],[0,.54,z],dark);
    for(const x of [-.15,.15])box([.025,.8,.015],[x,.51,.235],trim);
    this.lid=new THREE.Group();this.lid.position.set(0,1.06,-.23);this.root.add(this.lid);
    box([.45,.04,.48],[0,0,.23],trim,this.lid);
    box([.14,.035,.035],[0,.035,.4],dark,this.lid);
    this.matrix=new THREE.Matrix4();this.capMatrix=new THREE.Matrix4();this.position=new THREE.Vector3();
    this.q=new THREE.Quaternion();this.yaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.7);
    this.axis=new THREE.Vector3(0,0,1);this.look=new THREE.Vector3();this.propWorld=new THREE.Vector3();
  }
  update(state,reach) {
    const s=this.scene,v=this.tree,d=state.adventActivity;
    this.root.visible=Boolean(state.holiday?.tree?.active&&state.seasonal?.serviceDeck?.ready&&!state.thanksgiving);
    this.lid.rotation.x=0;
    if(!d||!this.root.visible)return;
    const a=AdventActors(d,s.robotHome.toArray());this.actors=a;
    this.lid.rotation.x=-1.5*a.lid;
    if(d.kind==='star') {
      v.star.visible=true;v.star.position.fromArray(a.prop).sub(this.position.fromArray(TREE));
      v.star.quaternion.copy(this.q.setFromAxisAngle(this.axis,a.roll)).multiply(this.yaw);
    } else if(d.kind==='present') {
      const gift=v.gifts[d.index||0];gift.visible=true;gift.position.fromArray(a.prop);
    } else if(d.kind==='ornament') {
      const index=d.ornamentIndex??8,normal=state.holiday.tree.ornamentCount;
      const count=Math.max(normal,index+1);
      for(let i=normal;i<count;i++)if(i!==index){this.matrix.makeScale(0,0,0);v.ornaments.setMatrixAt(i,this.matrix);v.ornamentCaps.setMatrixAt(i,this.matrix);}
      this.position.fromArray(a.prop).sub(this.propWorld.fromArray(TREE));
      this.matrix.makeRotationZ(a.roll).setPosition(this.position);v.ornaments.setMatrixAt(index,this.matrix);
      this.position.x-=Math.sin(a.roll)*.05;this.position.y+=Math.cos(a.roll)*.05;
      this.capMatrix.makeRotationZ(a.roll).setPosition(this.position);v.ornamentCaps.setMatrixAt(index,this.capMatrix);
      v.ornaments.count=v.ornamentCaps.count=count;
      v.ornaments.instanceMatrix.needsUpdate=v.ornamentCaps.instanceMatrix.needsUpdate=true;
      v.ornaments.frustumCulled=v.ornamentCaps.frustumCulled=false;v.activityDirty=true;
    } else if(d.kind==='garland')v.garlands[d.index||0].rotation.y=.1*a.crooked;
    else if(d.kind==='preparation'){v.sections[0].position.y=.012*a.crooked;a.contact[1]+=.012*a.crooked;}

    s.robot.position.fromArray(a.pip);s.robot.rotation.set(0,a.yaw,0);
    s.robotHead.rotation.set(a.headPitch,0,0);s.robotEye.scale.set(1+.08*a.satisfaction,1-.12*a.satisfaction,1);
    for(const arm of s.robotArms){arm.shoulder.rotation.set(0,0,arm.side*.14);arm.elbow.rotation.set(0,0,0);}
    s.robotTool.visible=a.tool;
    s.robotToolGlow.scale.setScalar(.22);s.robotToolGlow.material.opacity=.3;
    s.station.updateMatrixWorld(true);
    const looking=Smooth(d.elapsed/4)*(1-Smooth((d.elapsed-68)/14));
    this.look.fromArray(d.kind==='inspection'?[-6.6,.65,.65]:a.contact);
    if(d.kind!=='inspection')this.look.lerp(this.propWorld.set(-6.6,.65,.65),Smooth((d.elapsed-60)/4));
    s.station.localToWorld(this.look);s.robot.worldToLocal(this.look);this.look.sub(s.robotHead.position);
    s.robotHead.rotation.y=THREE.MathUtils.clamp(Math.atan2(this.look.x,this.look.z),-.7,.7)*looking;
    s.robotHead.rotation.x=THREE.MathUtils.clamp(-Math.atan2(this.look.y,Math.hypot(this.look.x,this.look.z)),-.6,.6)*looking;
    if(d.kind==='inspection')s.robotHead.rotation.x+=.08*a.satisfaction;
    // Parcels hang from their bow; keep the elbow above the grip while carrying.
    const pickupArc=d.kind==='present'?Math.PI:['star','ornament'].includes(d.kind)?Math.PI*(1-Smooth((d.elapsed-24)/14)):0;
    reach(s,s.robotArms[0],a.contact,d.kind==='inspection'?0:a.reach,true,pickupArc);
    s.pipPoseName='advent-'+d.kind;s.pipReactionName=d.elapsed>=60&&d.elapsed<68?'quietly-satisfied':'careful';
  }
}
