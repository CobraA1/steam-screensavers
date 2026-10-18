import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sceneSource = readFileSync(new URL("../scene.js", import.meta.url), "utf8");
const pipSource = readFileSync(new URL("../pip-animation.js", import.meta.url), "utf8");
const detailsSource = readFileSync(new URL("../station-details.js", import.meta.url), "utf8");
const serviceDeckSource = readFileSync(new URL("../seasonal-service-deck.js", import.meta.url), "utf8");

test("solar tiles are coplanar with their center spine and the dish faces its feed", () => {
  assert.match(sceneSource, /panel\.position\.set\(column \* 0\.93, 0, row \* 0\.4\)/);
  assert.match(sceneSource, /bowl\.rotation\.x = Math\.PI/);
});

test("visitor craft define four ports at each end and retain a main-to-RCS arrival handoff", () => {
  assert.match(sceneSource, /\{ x: -0\.9, direction: -1, group: "fore" \}/);
  assert.match(sceneSource, /\{ x: 0\.72, direction: 1, group: "aft" \}/);
  assert.match(sceneSource, /\{ y: -0\.28, z: 0 \}/);
  assert.match(sceneSource, /\{ y: 0\.28, z: 0 \}/);
  assert.match(sceneSource, /\{ y: 0, z: -0\.28 \}/);
  assert.match(sceneSource, /\{ y: 0, z: 0\.28 \}/);
  assert.match(sceneSource, /state\.shipTravel < 0\.82/);
  assert.match(sceneSource, /const activeGroup = "fore"/);
});

test("Pip services the light from its front and the cargo door has an edge pivot", () => {
  assert.match(sceneSource, /"repair-light": new THREE\.Vector3\(0\.48, 0\.72, 1\.35\)/);
  assert.match(pipSource, /taskId === "repair-light"\) return 2\.32/);
  assert.match(detailsSource, /hatchDoor\.position\.set\(-0\.265, 0, 0\.09\)/);
  assert.match(detailsSource, /hatchDoorPanel\.position\.x = 0\.265/);
});

test("Pip turns toward the antenna while adjusting or synchronizing", () => {
  assert.match(sceneSource, /"adjust-antenna": new THREE\.Vector3\(0\.08, 1\.38, 0\.48\)/);
  assert.match(sceneSource, /"survey-sync": new THREE\.Vector3\(0\.08, 1\.38, 0\.48\)/);
  assert.match(pipSource, /taskId === "adjust-antenna" \|\| taskId === "survey-sync"\) return 2\.8/);
});

test("the seasonal service deck attaches aft and remains separate from the visitor corridor", () => {
  assert.match(serviceDeckSource, /collar\.position\.set\(-2\.92, 0, 0\)/);
  assert.match(serviceDeckSource, /seasonal-service-deck/);
  assert.match(serviceDeckSource, /serviceDeckActive/);
  assert.doesNotMatch(serviceDeckSource, /ship\.position|shipTravel|visitor/);
});
