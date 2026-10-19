import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.js";
import { AntennaDreamVisual } from "../dream-renderer.js";
import { PhantomDreamVisual } from "../phantom-dream-renderer.js";
const fixture=()=>{const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(39,1.6,0.1,100), head=new THREE.Object3D();camera.position.z=12;camera.updateMatrixWorld();scene.add(head);return {scene,camera,head};};
test("dreams share one articulated Pip geometry",()=>{const {scene}=fixture();const a=new AntennaDreamVisual(scene),p=new PhantomDreamVisual(scene);assert.equal(a.pip.name,"dream-pip");assert.equal(p.pip.name,"dream-pip");assert.equal(a.arms.length,2);assert.equal(p.arms.length,2);assert.equal(a.pip.children.length,p.pip.children.length);assert.equal(a.head.position.y,p.head.position.y);});
test("Phantom dream resets pose when seeking backwards",()=>{const {scene,camera,head}=fixture();const p=new PhantomDreamVisual(scene);const desc=(beatId,beatProgress)=>({type:"phantom-visitor-2026",beatId,beatProgress,progress:0.5,variant:1});p.update(desc("untangle",0.6),camera,head);assert.equal(p.tool.visible,false);p.update(desc("glimpse",0),camera,head);assert.equal(p.pipArm.scale.y,1);assert.ok(Math.abs(p.head.rotation.z)<1e-12);p.update(null,camera,head);assert.equal(p.root.visible,false);});
