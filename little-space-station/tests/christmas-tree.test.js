import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { Advent, HolidayCalendar, DAY } from '../holiday-calendar.js';
import { CHRISTMAS_PRESENTS, CHRISTMAS_TREE_POSITION } from '../christmas-tree.js';
import { ChristmasTreeVisual } from '../christmas-tree-renderer.js';
import { HolidayRuntime } from '../holiday-runtime.js';
import { ResolveServiceDeck } from '../service-deck-lifecycle.js';
import { CreateSeasonalManifest, ResolveAutumn2026, ApplyAutumn2026State } from '../autumn-2026.js';
import { SERVICE_DECK_LAYOUT, SeasonalServiceDeckVisual } from '../seasonal-service-deck.js';

const date = (month, day, year = 2026) => Date.UTC(year, month - 1, day);
const tree = time => HolidayCalendar(time).tree;
function fixture() { const parent = new THREE.Group(); return new ChristmasTreeVisual(parent); }
function render(visual, time, full = false) {
  visual.update(tree(time), ResolveServiceDeck(time).ready, false, full);
  visual.root.updateMatrixWorld(true);
}
function snapshot(visual) {
  const objects = []; visual.root.traverse(o => objects.push([o.name, o.visible, o.matrix.toArray(), o.count]));
  return [objects, visual.bulbMaterial.emissiveIntensity, visual.glow.intensity];
}

test('2026 tree and gift stages reconstruct exact UTC date boundaries', () => {
  const stages = [
    [11,29,0,0,0,false], [11,30,0,0,1,false],
    [12,6,1,0,1,false], [12,7,1,0,2,false], [12,8,2,0,2,false], [12,10,3,0,2,false],
    [12,13,3,6,3,false], [12,15,3,12,3,false], [12,17,3,18,3,false],
    [12,20,3,22,4,false], [12,22,3,24,4,true], [12,23,3,26,5,true],
  ];
  for (const [month, day, strings, ornaments, gifts, star] of stages) {
    const time = date(month, day), state = tree(time);
    assert.ok(state.active); assert.equal(state.sections, 3);
    assert.deepEqual([state.garlandBands, state.ornamentCount, state.presentCount, state.star], [strings, ornaments, gifts, star]);
    assert.notDeepEqual(tree(time - 1), state, 'boundary ' + month + '/' + day);
    tree(time + 35 * DAY); assert.deepEqual(tree(time), state);
  }
  assert.equal(tree(date(11,29) - 1).active, false);
  assert.equal(tree(date(12,23)).complete, true);
  assert.deepEqual(tree(date(12,24)), tree(date(12,23)));
});

test('finished gifts stay wrapped across Christmas and New Year, then clear for dismantling', () => {
  const v = fixture();
  for (const time of [date(12,23),date(12,24),date(12,25),date(12,31),date(1,1,2027),date(1,5,2027)]) {
    render(v,time);
    assert.ok(v.root.visible); assert.equal(v.gifts.filter(g=>g.visible).length,5);
    assert.ok(v.gifts.every(g=>g.userData.wrapped));
    assert.deepEqual(v.gifts.map(g=>g.userData.giftId), CHRISTMAS_PRESENTS.map(g=>g.id));
  }
  for (const time of [date(1,6,2027),date(1,6,2027)+DAY/2,date(1,7,2027)]) {
    render(v,time); assert.equal(tree(time).active,false); assert.equal(v.root.visible,false);
    assert.ok(v.gifts.every(g=>!g.visible)); assert.equal(v.glow.intensity,0);
  }
  assert.equal(ResolveServiceDeck(date(1,6,2027)).action,'remove');
  assert.equal(ResolveServiceDeck(date(1,7,2027)).active,false);
});

test('late Advent years still finish by December 23 and retain the prior season in January', () => {
  for(let year=2026;year<=2125;year++) {
    assert.equal(tree(Advent(year)).active,true);
    assert.equal(tree(date(12,23,year)).complete,true);
    assert.equal(tree(date(12,23,year)).presentCount,5);
    assert.deepEqual(tree(date(1,5,year+1)),tree(date(12,24,year)));
    assert.equal(tree(date(1,6,year+1)).active,false);
  }
});

test('rendering resets all decorations and lights on reverse date and illumination seeks', () => {
  const a=fixture(),b=fixture();
  for(const time of [date(1,6,2027),date(12,23),date(12,20),date(12,15),date(12,8),date(11,30),date(11,28)]) {
    render(a,date(12,24),true); render(a,time); render(b,time);
    assert.deepEqual(snapshot(a),snapshot(b));
    const state=tree(time);
    assert.equal(a.ornaments.count,state.ornamentCount);
    assert.equal(a.garlands.filter(g=>g.visible).length,state.garlandBands);
    assert.equal(a.gifts.filter(g=>g.visible).length,state.presentCount);
  }
  a.update(tree(date(12,24)),false,false,true); assert.equal(a.root.visible,false); assert.equal(a.glow.intensity,0);
  a.update(tree(date(12,24)),true,true,true); assert.equal(a.root.visible,false);
});

test('tree, gifts, wreath and cabin fit inside the extended Commons Deck with distinct footprints', () => {
  const v=fixture();render(v,date(12,24));
  const bounds=o=>new THREE.Box3().setFromObject(o);
  const t=bounds(v.tree);
  assert.ok(t.max.y-CHRISTMAS_TREE_POSITION[1]>=1.5 && t.max.y-CHRISTMAS_TREE_POSITION[1]<=1.6);
  // Inner faces of rails and cabin, plus the existing wreath table envelope.
  const aft=SERVICE_DECK_LAYOUT.x-SERVICE_DECK_LAYOUT.width/2+.25;
  assert.ok(t.min.x> aft && t.min.z> -.23 && t.max.x< -4.79 && t.max.z<1.2);
  const table=new THREE.Box3(new THREE.Vector3(-5.9,-.43,1.69),new THREE.Vector3(-4.78,.78,2.35));
  assert.equal(t.intersectsBox(table),false);
  const gifts=v.gifts.map(bounds);
  gifts.forEach((g,i)=>{
    assert.ok(g.min.x> aft && g.max.x< -4.79 && g.min.z>-.23 && g.max.z<2.43);
    assert.ok(Math.abs(g.min.y+.43)<1e-7,'floor contact');
    assert.equal(g.intersectsBox(table),false);
    gifts.slice(i+1).forEach(other=>assert.equal(g.intersectsBox(other),false));
    // Branches and gifts must also remain separate in actual mesh space.
    v.sections.forEach(section=>assert.equal(g.intersectsBox(bounds(section)),false,CHRISTMAS_PRESENTS[i].id+' / '+section.name));
  });
  assert.equal(new Set(v.gifts.map(g=>g.userData.giftId)).size,5);
});

test('tree scenery does not write story history and full illumination is preview-only', () => {
  const store={commitSeasonalIncident:()=>assert.fail('scenery wrote history')};
  for(const preview of [false,true]) {
    const runtime={seasonalPreview:'natural',treeFullIllumination:true};
    const h=new HolidayRuntime({preview,seed:'tree',store,runtime});
    const state={phase:'quiet'};
    for(const time of [date(11,29),date(12,13),date(12,25),date(1,6,2027)]) {
      h.update(state,0,time,0,false);
      assert.deepEqual(state.holiday.tree,tree(time));
      assert.equal(Boolean(state.holiday.treeFullLight),preview);
      assert.equal(state.thanksgiving,null);
    }
  }
});

test('Advent provisions reuse stable freight manifests and leave earlier seasonal themes intact', () => {
  for(const [month,day,word] of [[11,30,'Tree|evergreen'],[12,8,'garland|light'],[12,17,'ornaments|parcels']]) {
    const visit={eventId:'cargo-run',visitId:'tree-provisions',approachStartMs:date(month,day)};
    const m=CreateSeasonalManifest('tree',visit,{forceTheme:'advent'});
    assert.ok(m.packageCount>=2&&m.packageCount<=4);
    assert.ok(m.packages.every(p=>new RegExp(word,'i').test(p.label)));
    assert.deepEqual(m,CreateSeasonalManifest('tree',visit,{forceTheme:'advent'}));
    assert.equal(CreateSeasonalManifest('tree',{...visit,eventId:'courier-stop'}),null);
  }
  // Exercise the normal seeded selection too, not only the forced test route.
  const themes=new Set();
  for(let i=0;i<30;i++) {
    const m=CreateSeasonalManifest('tree',{eventId:'cargo-run',visitId:'advent-'+i,approachStartMs:date(12,8)});
    if(m)themes.add(m.theme);
  }
  assert.deepEqual([...themes],['advent']);
  const time=date(12,8),seasonal=ResolveAutumn2026('tree',time,{previewMode:'advent-cargo'});
  assert.deepEqual(seasonal.installedDecorations,[],'supply preview must not bring back autumn props');
  const state={eventId:'cargo-run',visitId:'supplies',visitStartMs:time,worldTimeMs:time,phase:'approach'};
  ApplyAutumn2026State(state,seasonal,'tree');
  assert.ok(state.cargoManifest.length>=2);
  assert.ok(state.cargoManifest.every(p=>/garland|light/i.test(p.label)));
});

test('aft floor extension, rails, supports and lights remain attached to their original lifecycle groups', () => {
  const material=new THREE.MeshStandardMaterial();
  const scene={station:new THREE.Group(),materials:new Proxy({},{get:()=>material})};
  const deck=new SeasonalServiceDeckVisual(scene),time=date(12,24);
  deck.update({worldTimeMs:time,seasonal:ResolveAutumn2026('tree',time)});
  scene.station.updateMatrixWorld(true);
  const bounds=o=>new THREE.Box3().setFromObject(o),floor=bounds(deck.parts[2]);
  assert.ok(Math.abs(floor.min.x-(SERVICE_DECK_LAYOUT.x-SERVICE_DECK_LAYOUT.width/2))<1e-6);
  for(const tile of deck.parts[2].children.filter(o=>o.geometry?.type==='BoxGeometry')) {
    const b=bounds(tile);
    assert.ok(b.min.x>floor.min.x+.1 && b.max.x<floor.max.x-.1,'tile leaves the perimeter trim clear');
  }
  for(const index of [1,4,5]) {
    const b=bounds(deck.parts[index]);
    assert.ok(b.min.x>floor.min.x && b.min.x<floor.min.x+.4,deck.parts[index].name+' follows aft edge');
    assert.ok(b.max.x<floor.max.x);
  }
  assert.equal(deck.parts[3].getObjectByName('service-deck-utility-cabin').position.x,-3.98);
  const v=fixture();
  for(const time of [date(10,31),date(11,1),date(11,26)]) {
    render(v,time);assert.equal(v.root.visible,false,'tree absent from earlier seasonal stories');
  }
  const removed=ResolveServiceDeck(date(1,7,2027));
  deck.update({worldTimeMs:date(1,7,2027),seasonal:{serviceDeckActive:removed.active,serviceDeck:removed}});
  assert.equal(deck.root.visible,false);
});
