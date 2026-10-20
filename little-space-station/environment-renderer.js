const SEASON_NAMES = Object.freeze(["spring", "summer", "autumn", "winter"]);

function Smooth(value) {
  return value * value * (3 - 2 * value);
}

function SeasonColor(palette, index, atmosphere) {
  if (index === 0) return atmosphere ? palette.springAtmosphere : palette.springPlanet;
  if (index === 1) return atmosphere ? palette.summerAtmosphere : palette.summerPlanet;
  if (index === 2) return atmosphere ? palette.autumnAtmosphere : palette.autumnPlanet;
  return atmosphere ? palette.winterAtmosphere : palette.winterPlanet;
}

function UpdatePlanetSurface(scene, state, firstSeason, secondSeason, blend) {
  const previousPhase = scene.lastPlanetSeasonPhase;
  const phaseDifference = Number.isFinite(previousPhase)
    ? Math.min(Math.abs(state.seasonalPhase - previousPhase), 1 - Math.abs(state.seasonalPhase - previousPhase))
    : 1;
  if (phaseDifference < 0.00001 && scene.lastPlanetSeasonStrength === state.seasonalEffectStrength) return;

  const colors = scene.planetSeasonColors;
  const neutral = colors.autumn;
  const first = colors[SEASON_NAMES[firstSeason]];
  const second = colors[SEASON_NAMES[secondSeason]];
  const output = scene.planetSeasonColorAttribute.array;
  const strength = state.seasonalEffectStrength;
  for (let index = 0; index < output.length; index += 1) {
    const seasonal = first[index] + (second[index] - first[index]) * blend;
    output[index] = neutral[index] + (seasonal - neutral[index]) * strength;
  }
  scene.planetSeasonColorAttribute.needsUpdate = true;
  scene.lastPlanetSeasonPhase = state.seasonalPhase;
  scene.lastPlanetSeasonStrength = strength;
}

export function UpdateEnvironmentVisuals(scene, state) {
  const palette = scene.environmentPalette;
  const daylight = state.directSunlight;
  const shadow = state.shadowDepth;
  const artificial = state.artificialLightBoost;
  const transitionGlow = state.illuminationState === "transition"
    ? Math.sin(state.illuminationProgress * Math.PI)
    : 0;

  scene.environmentArtificialBoost = artificial;
  scene.sunlight.intensity = 0.12 + daylight * 3.66;
  scene.sunlight.color.copy(palette.daySun).lerp(palette.shadowSun, shadow);
  if (transitionGlow > 0) scene.sunlight.color.lerp(palette.sunsetSun, transitionGlow * 0.62);
  scene.sunlight.position.set(-7, 9 + state.seasonalSunTilt * 2.2, 10 - state.seasonalSunTilt * 1.4);

  scene.hemisphereLight.intensity = 0.55 + state.sunlightLevel;
  scene.hemisphereLight.color.lerpColors(palette.shadowSky, palette.daySky, state.sunlightLevel);
  scene.hemisphereLight.groundColor.lerpColors(palette.shadowGround, palette.dayGround, state.sunlightLevel);
  scene.planetBounce.intensity = 6 + daylight * 12;
  scene.warmFill.intensity = 2.4 + daylight * 6.6;
  scene.renderer.toneMappingExposure = 0.88 + state.sunlightLevel * 0.15;
  scene.scene.fog.color.lerpColors(palette.shadowFog, palette.dayFog, state.sunlightLevel);
  scene.stars.material.opacity = 0.8 + shadow * 0.16;

  const seasonPosition = state.seasonalPhase * 4 - 0.5;
  const seasonFloor = Math.floor(seasonPosition);
  const firstSeason = ((seasonFloor % 4) + 4) % 4;
  const secondSeason = (firstSeason + 1) % 4;
  const seasonBlend = Smooth(seasonPosition - seasonFloor);
  UpdatePlanetSurface(scene, state, firstSeason, secondSeason, seasonBlend);

  palette.scratchA.copy(SeasonColor(palette, firstSeason, false))
    .lerp(SeasonColor(palette, secondSeason, false), seasonBlend);
  palette.scratchB.copy(palette.neutralPlanet).lerp(palette.scratchA, state.seasonalEffectStrength);
  scene.planetMaterial.color.copy(palette.scratchB);
  palette.scratchA.copy(SeasonColor(palette, firstSeason, true))
    .lerp(SeasonColor(palette, secondSeason, true), seasonBlend);
  palette.scratchB.copy(palette.neutralAtmosphere).lerp(palette.scratchA, state.seasonalEffectStrength);
  scene.planetAtmosphereMaterial.color.copy(palette.scratchB);
  scene.planetAtmosphereMaterial.opacity = 0.12 + shadow * 0.035 + state.seasonalEffectStrength * (0.025 + state.iceCoverage * 0.012);

  scene.materials.window.emissiveIntensity = 2.2 + artificial * 1.9;
  scene.materials.warmWindow.emissiveIntensity = 2 + artificial * 2.5;
  scene.shipCabinLight.intensity = 0.2 + artificial * 1.35;
}
