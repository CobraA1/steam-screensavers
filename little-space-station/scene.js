import * as THREE from "./vendor/three.module.js";
import { CreateRandom, DeriveSeed } from "./random.js";
import { SamplePlanetFaces } from "./planet-geography.js";
import { SmoothStep } from "./simulation-world.js";
import { BuildStationDetails, UpdateStationDetails } from "./station-details.js";
import { UpdatePip } from "./pip-animation.js";
import { UpdateEnvironmentVisuals } from "./environment-renderer.js";
import { CameraFramingController } from "./camera-framing.js";
import { AntennaDreamVisual } from "./dream-renderer.js";
import { PhantomDreamVisual } from "./phantom-dream-renderer.js";
import { DreamCompositor } from "./dream-compositor.js";
import { Autumn2026Visual } from "./seasonal-renderer.js";
import { SERVICE_DECK_ANCHORS, SeasonalServiceDeckVisual } from "./seasonal-service-deck.js";
import { PhantomVisitorVisual } from "./phantom-renderer.js";
import { RemembranceVisual } from "./remembrance-renderer.js";

const QUALITY = Object.freeze({
  low: { stars: 520, radialSegments: 10, sphereSegments: 18 },
  medium: { stars: 900, radialSegments: 14, sphereSegments: 24 },
  high: { stars: 1450, radialSegments: 18, sphereSegments: 32 },
});

const IVORY = 0xe7dcc0;
const ORANGE = 0xb95532;
const TEAL = 0x316f71;
const METAL = 0x626b70;
const DARK_METAL = 0x26333a;
const WINDOW = 0x7de2d4;
const DEFAULT_ENVIRONMENT = Object.freeze({
  directSunlight: 1,
  sunlightLevel: 1,
  shadowDepth: 0,
  artificialLightBoost: 0,
  planetRotationPhase: 0,
  seasonalWarmth: 0,
  iceCoverage: 0.5,
  seasonalSunTilt: 0,
  seasonalEffectStrength: 0,
});

function EaseInOut(value) {
  const t = Math.max(0, Math.min(1, value));
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function MakeRod(start, end, radius, material, segments = 8) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), segments),
    material,
  );
  rod.position.copy(start).add(end).multiplyScalar(0.5);
  rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return rod;
}

function MakeBarrel(radius, length, material, segments) {
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, segments, 1, false),
    material,
  );
  barrel.rotation.z = Math.PI / 2;
  return barrel;
}

function AddEdges(mesh, color = 0x1c282c, opacity = 0.42) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 24),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
  mesh.add(edges);
}

export class LittleSpaceStationScene {
  constructor(canvas, config, identity, { preview = false } = {}) {
    this.config = config;
    this.identity = identity;
    this.quality = QUALITY[config.visualQuality] || QUALITY.medium;
    this.elapsed = 0;
    this.width = 1;
    this.height = 1;
    this.pixelRatio = 1;
    // These endpoints deliberately sit outside the widest supported camera frustum.
    // The approach phase can therefore make the craft cross into view naturally.
    this.shipApproach = new THREE.Vector3(18, 5, -7);
    this.shipDock = new THREE.Vector3(3.55, 0.03, 0.02);
    this.shipBackout = new THREE.Vector3(5.8, 0.03, 0.02);
    this.shipDeparture = new THREE.Vector3(19, 0.03, -9);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: config.visualQuality !== "low",
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x03060d, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x03060d, 0.012);
    this.camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
    this.camera.position.set(10.6, 6.3, 14.5);
    this.cameraFraming = new CameraFramingController(this.camera, { preview, presetId: config.cameraFraming });

    this.materials = this.CreateMaterials();
    this.blinkers = [];
    this.panelPivots = [];
    this.BuildLights();
    this.BuildStarfield();
    this.BuildPlanet();
    this.BuildStation();
    this.cameraFraming.setReviewStation(this.station);
    Object.assign(this, BuildStationDetails(this.station, this.materials));
    this.BuildVisitor();
    this.BuildRobot();
    this.seasonalServiceDeckVisual = new SeasonalServiceDeckVisual(this);
    this.autumn2026Visual = new Autumn2026Visual(this);
    this.phantomVisitorVisual = new PhantomVisitorVisual(this);
    this.remembranceVisual = new RemembranceVisual(this);
  }

  CreateMaterials() {
    const stationMaterial = (color, roughness = 0.62, metalness = 0.18) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });

    const variedOrange = new THREE.Color(ORANGE);
    variedOrange.offsetHSL(this.identity.station.orangeHueShift, 0, 0);

    return {
      ivory: stationMaterial(IVORY, 0.72, 0.08),
      orange: stationMaterial(variedOrange, 0.63, 0.12),
      teal: stationMaterial(TEAL, 0.64, 0.2),
      metal: stationMaterial(METAL, 0.42, 0.72),
      dark: stationMaterial(DARK_METAL, 0.48, 0.64),
      black: stationMaterial(0x0b1115, 0.5, 0.5),
      solar: new THREE.MeshStandardMaterial({ color: 0x214b5d, roughness: 0.5, metalness: 0.3 }),
      window: new THREE.MeshStandardMaterial({
        color: 0x87d6c9,
        emissive: WINDOW,
        emissiveIntensity: 2.4,
        roughness: 0.25,
      }),
      warmWindow: new THREE.MeshStandardMaterial({
        color: 0xffc678,
        emissive: 0xff8738,
        emissiveIntensity: 2.1,
        roughness: 0.25,
      }),
    };
  }

  BuildLights() {
    this.hemisphereLight = new THREE.HemisphereLight(0xa8cbda, 0x17212a, 1.55);
    this.scene.add(this.hemisphereLight);
    this.sunlight = new THREE.DirectionalLight(0xffead1, 4.2);
    this.sunlight.position.set(-7, 9, 10);
    this.scene.add(this.sunlight);
    this.planetBounce = new THREE.PointLight(0x3b9da5, 18, 35, 2);
    this.planetBounce.position.set(8, -5, -7);
    this.scene.add(this.planetBounce);
    this.warmFill = new THREE.PointLight(0xd8703d, 9, 18, 2);
    this.warmFill.position.set(-5, 1, 5);
    this.scene.add(this.warmFill);
    this.environmentPalette = Object.freeze({
      daySun: new THREE.Color(0xffead1),
      sunsetSun: new THREE.Color(0xffa35c),
      shadowSun: new THREE.Color(0x7d9fc7),
      daySky: new THREE.Color(0xa8cbda),
      shadowSky: new THREE.Color(0x405570),
      dayGround: new THREE.Color(0x24323a),
      shadowGround: new THREE.Color(0x152237),
      dayFog: new THREE.Color(0x03060d),
      shadowFog: new THREE.Color(0x06101d),
      springPlanet: new THREE.Color(0xe3f4df),
      summerPlanet: new THREE.Color(0xf2e5bf),
      autumnPlanet: new THREE.Color(0xf0cfb0),
      winterPlanet: new THREE.Color(0xe7f3f6),
      neutralPlanet: new THREE.Color(0xffffff),
      springAtmosphere: new THREE.Color(0x6ad4bd),
      summerAtmosphere: new THREE.Color(0x5ec8c0),
      autumnAtmosphere: new THREE.Color(0x76b9bd),
      winterAtmosphere: new THREE.Color(0x7aafd0),
      neutralAtmosphere: new THREE.Color(0x6bc4c1),
      scratchA: new THREE.Color(),
      scratchB: new THREE.Color(),
    });
  }

  BuildStarfield() {
    const random = CreateRandom(DeriveSeed(this.config.worldSeed, "starfield-v1"));
    const positions = new Float32Array(this.quality.stars * 3);
    const colors = new Float32Array(this.quality.stars * 3);
    const color = new THREE.Color();

    for (let index = 0; index < this.quality.stars; index += 1) {
      const radius = 26 + random() * 48;
      const theta = random() * Math.PI * 2;
      const vertical = random() * 2 - 1;
      const spread = Math.sqrt(1 - vertical * vertical);
      const offset = index * 3;
      positions[offset] = Math.cos(theta) * spread * radius;
      positions[offset + 1] = vertical * radius;
      positions[offset + 2] = Math.sin(theta) * spread * radius;
      color.setHSL(0.08 + random() * 0.52, 0.18 + random() * 0.25, 0.67 + random() * 0.3);
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.stars = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.09,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      }),
    );
    this.scene.add(this.stars);
  }

  BuildPlanet() {
    const radius = 5.7;
    // A little extra geometry makes recognizable coastlines possible while
    // retaining the deliberately faceted low-poly silhouette.
    const detail = this.config.visualQuality === "high" ? 9
      : this.config.visualQuality === "low" ? 5 : 7;
    const geometry = new THREE.IcosahedronGeometry(radius, detail);
    const positions = geometry.attributes.position;
    const faces = SamplePlanetFaces(positions, this.config.worldSeed);
    const seasonalColors = {
      spring: new Float32Array(positions.count * 3),
      summer: new Float32Array(positions.count * 3),
      autumn: new Float32Array(positions.count * 3),
      winter: new Float32Array(positions.count * 3),
    };
    const currentColors = new Float32Array(positions.count * 3);
    const sample = new THREE.Color();
    const oceanDeep = new THREE.Color(0x163e5b);
    const oceanBright = new THREE.Color(0x2b748a);
    const oceanCoast = new THREE.Color(0x45959d);
    const beach = new THREE.Color(0xc5af80);
    const snow = new THREE.Color(0xeaf2ee);
    // Keep seasonal geography fixed while letting its vegetation respond in
    // ways that remain readable from the production camera at planet scale:
    // spring is fresh bright green, summer has darker forest and golden dry
    // country, and autumn grows distinctly copper/orange instead of beige.
    const seasonLand = {
      spring: [new THREE.Color(0x377f50), new THREE.Color(0x8cd36b)],
      summer: [new THREE.Color(0x2b5444), new THREE.Color(0x639058)],
      autumn: [new THREE.Color(0x85533e), new THREE.Color(0xce8748)],
      winter: [new THREE.Color(0x607e77), new THREE.Color(0xa6b0a1)],
    };
    const seasonDry = {
      spring: new THREE.Color(0xa0bc6f),
      summer: new THREE.Color(0xc9ac6a),
      autumn: new THREE.Color(0xda9857),
      winter: new THREE.Color(0x999b91),
    };
    const autumnCopper = new THREE.Color(0xba613b);
    const autumnEvergreen = new THREE.Color(0x577b56);
    const uplandRock = new THREE.Color(0x7b8d85);
    const snowLines = { spring: 0.69, summer: 0.80, autumn: 0.61, winter: 0.31 };
    const Clamp01 = (value) => Math.max(0, Math.min(1, value));
    const Smooth = (value) => { const t = Clamp01(value); return t * t * (3 - 2 * t); };

    function WriteFaceColor(buffer, first, color) {
      // Assign the same color to all three vertices of a face. THREE's
      // flatShading controls normals, not interpolated vertex colors.
      for (let vertex = first; vertex < first + 3; vertex += 1) {
        const offset = vertex * 3;
        buffer[offset] = color.r;
        buffer[offset + 1] = color.g;
        buffer[offset + 2] = color.b;
      }
    }

    for (let face = 0; face < faces.length; face += 1) {
      const terrain = faces[face];
      const first = face * 3;
      if (!terrain.land) {
        // Deep ocean and a little shallow turquoise along continental shores.
        sample.copy(oceanDeep).lerp(oceanBright, 0.16 + terrain.tone * 0.64);
        sample.lerp(oceanCoast, 0.55 * Clamp01((terrain.coast + 0.10) / 0.10));
        for (const buffer of Object.values(seasonalColors)) WriteFaceColor(buffer, first, sample);
        continue;
      }

      const coast = 1 - Clamp01(terrain.coast / 0.052);
      const tones = 0.12 + terrain.tone * 0.76;
      // Coherent, varied inland greens/dry patches avoid the previous flat
      // mustard-colored landmass. These masks do not shift between seasons.
      const dry = Smooth((0.43 - terrain.moisture) / 0.30);
      const rocky = Smooth((terrain.highland - 0.70) / 0.25);
      for (const [season, buffer] of Object.entries(seasonalColors)) {
        sample.copy(seasonLand[season][0]).lerp(seasonLand[season][1], tones);
        sample.lerp(seasonDry[season], dry * 0.76);
        if (season === "autumn") {
          // A little retained evergreen interrupts the fall color, while
          // russet patches remain visible even in the wetter continental areas.
          sample.lerp(autumnCopper, (0.14 + terrain.tone * 0.23) * (1 - dry * 0.45));
          sample.lerp(autumnEvergreen, Smooth((terrain.moisture - 0.76) / 0.2) * 0.25);
        }
        sample.lerp(uplandRock, rocky * 0.22);
        // A narrow warm shoreline, not a flat sandy continent.
        sample.lerp(beach, coast * 0.16);
        // Snow is part of the same land polygons as forest and rock.
        const snowAmount = Smooth((terrain.latitude + (terrain.highland - 0.5) * 0.06 - snowLines[season]) / 0.18);
        sample.lerp(snow, snowAmount * (season === "summer" ? 0.90 : 1));
        WriteFaceColor(buffer, first, sample);
      }
    }

    currentColors.set(seasonalColors.spring);
    geometry.setAttribute("color", new THREE.BufferAttribute(currentColors, 3));
    this.planetSeasonColors = seasonalColors;
    this.planetSeasonColorAttribute = geometry.getAttribute("color");
    this.lastPlanetSeasonPhase = Number.NaN;
    this.lastPlanetSeasonStrength = Number.NaN;

    this.planet = new THREE.Group();
    // The closer default framing benefits from a little more of the planet at the edge.
    this.planet.position.set(7.65, -4.5, -10.5);
    this.planetMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.94, metalness: 0, flatShading: true,
    });
    const globe = new THREE.Mesh(geometry, this.planetMaterial);
    globe.rotation.z = -0.18;
    this.planetGlobe = globe;
    this.planet.add(globe);

    // Retain the subtle independent atmosphere glow; only the ice shell goes.
    this.planetAtmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x6bc4c1,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.planetAtmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.032, this.quality.sphereSegments, 16),
      this.planetAtmosphereMaterial,
    );
    this.planet.add(this.planetAtmosphere);
    this.scene.add(this.planet);
  }

  BuildStation() {
    const segments = this.quality.radialSegments;
    const m = this.materials;
    this.station = new THREE.Group();
    this.station.rotation.set(-0.06, -0.28, -0.06);
    this.station.position.set(-0.7, 0.15, 0);
    this.scene.add(this.station);

    const main = MakeBarrel(1.05, 2.7, m.ivory, segments);
    AddEdges(main);
    this.station.add(main);

    for (const x of [-1.38, -0.85, 0.85, 1.38]) {
      const collar = MakeBarrel(1.095, 0.12, x < -1 ? m.teal : m.orange, segments);
      collar.position.x = x;
      this.station.add(collar);
    }

    const aft = MakeBarrel(0.77, 1.35, m.teal, segments);
    aft.position.x = -2.02;
    AddEdges(aft);
    this.station.add(aft);
    const aftCap = MakeBarrel(0.82, 0.18, m.metal, segments);
    aftCap.position.x = -2.72;
    this.station.add(aftCap);

    const dockNeck = MakeBarrel(0.56, 0.9, m.orange, segments);
    dockNeck.position.x = 1.78;
    this.station.add(dockNeck);
    const dockRing = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.12, 8, segments), m.metal);
    dockRing.rotation.y = Math.PI / 2;
    dockRing.position.x = 2.28;
    this.station.add(dockRing);
    const dockMouthMaterial = new THREE.MeshStandardMaterial({
      color: 0x101a20,
      emissive: 0x071214,
      emissiveIntensity: 0.35,
      roughness: 0.86,
      metalness: 0.25,
    });
    const dockMouth = new THREE.Mesh(new THREE.CircleGeometry(0.46, segments), dockMouthMaterial);
    dockMouth.rotation.y = Math.PI / 2;
    dockMouth.position.x = 2.29;
    this.station.add(dockMouth);
    const dockGuideMaterial = new THREE.MeshBasicMaterial({ color: 0x4d9d98, transparent: true, opacity: 0.42 });
    const dockGuide = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.018, 6, segments), dockGuideMaterial);
    dockGuide.rotation.y = Math.PI / 2;
    dockGuide.position.x = 2.305;
    this.station.add(dockGuide);

    const observation = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, segments, 8, 0, Math.PI * 2, 0, Math.PI * 0.72),
      m.warmWindow,
    );
    observation.position.set(-0.35, 0.95, 0);
    observation.scale.set(1.25, 0.72, 0.9);
    this.station.add(observation);
    const observationBase = MakeBarrel(0.66, 0.35, m.orange, segments);
    observationBase.rotation.set(0, 0, 0);
    observationBase.position.set(-0.35, 0.7, 0);
    this.station.add(observationBase);

    this.BuildWindows();
    this.BuildSolarPanels();
    this.BuildDish();
    this.BuildTanks();
    this.BuildPipes();
    this.BuildBeacons();
  }

  BuildWindows() {
    const m = this.materials;
    for (const x of [-0.72, -0.25, 0.23, 0.7]) {
      for (const side of [-1, 1]) {
        const window = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 6), m.window.clone());
        window.scale.set(0.66, 1, 0.28);
        window.position.set(x, 0.18, side * 1.015);
        this.station.add(window);
        this.blinkers.push({ object: window, kind: "window", phase: x * 2.3 + side, speed: 0.37, minimum: 0.78 });
      }
    }
  }

  BuildSolarPanels() {
    const m = this.materials;
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.z = side * 0.9;
      this.station.add(pivot);
      this.panelPivots.push({ pivot, side });

      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.1, 8), m.metal);
      boom.rotation.x = Math.PI / 2;
      boom.position.z = side * 1.05;
      pivot.add(boom);

      const wing = new THREE.Group();
      wing.position.z = side * 2.35;
      pivot.add(wing);
      for (let row = -1; row <= 1; row += 2) {
        for (let column = -1; column <= 1; column += 1) {
          const panel = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.045, 0.72), m.solar);
          // Keep both panel rows coplanar with, and visibly attached to, the center spine.
          panel.position.set(column * 0.93, 0, row * 0.4);
          AddEdges(panel, 0x86bfbd, 0.78);
          wing.add(panel);
        }
      }
      const spine = MakeRod(new THREE.Vector3(-1.42, 0, 0), new THREE.Vector3(1.42, 0, 0), 0.035, m.metal, 6);
      wing.add(spine);
    }
  }

  BuildDish() {
    const m = this.materials;
    const mast = MakeRod(new THREE.Vector3(0.25, 1, 0), new THREE.Vector3(0.25, 1.72, 0), 0.07, m.metal);
    this.station.add(mast);
    this.dishPivot = new THREE.Group();
    this.dishPivot.position.set(0.25, 1.75, 0);
    this.station.add(this.dishPivot);

    // These parts sit on the fixed mast base, not the moving dish pivot. The
    // temporary preview story can therefore make the fault and its repair legible.
    this.antennaDriveIndicatorMaterial = new THREE.MeshStandardMaterial({
      color: 0x6ce5d5, emissive: 0x2dcab7, emissiveIntensity: 1.2, roughness: 0.24,
    });
    const driveHousing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.24), m.dark);
    driveHousing.position.set(0.25, 1.48, 0.03);
    this.station.add(driveHousing);
    this.antennaDriveIndicator = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), this.antennaDriveIndicatorMaterial);
    this.antennaDriveIndicator.position.set(0.25, 1.5, 0.162);
    this.station.add(this.antennaDriveIndicator);
    this.antennaRepairPlate = new THREE.Group();
    this.antennaRepairPlate.position.set(0.25, 1.46, 0.17);
    const plateMaterial = new THREE.MeshStandardMaterial({ color: 0xe47d32, roughness: 0.46, metalness: 0.36, flatShading: true });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.27, 0.045), plateMaterial);
    this.antennaRepairPlate.add(plate);
    for (const x of [-0.15, 0.15]) {
      for (const y of [-0.08, 0.08]) {
        const fastener = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.018, 7), m.metal);
        fastener.rotation.x = Math.PI / 2;
        fastener.position.set(x, y, 0.03);
        this.antennaRepairPlate.add(fastener);
      }
    }
    this.antennaRepairPlate.visible = false;
    this.station.add(this.antennaRepairPlate);

    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.58, 0.25, this.quality.radialSegments, 1, true),
      new THREE.MeshStandardMaterial({
        color: IVORY,
        roughness: 0.58,
        metalness: 0.28,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
    );
    // CylinderGeometry's wide end starts on -Y; flip it so the open face and feed point agree.
    bowl.rotation.x = Math.PI;
    bowl.position.y = 0.12;
    this.dishPivot.add(bowl);
    const receiver = MakeRod(new THREE.Vector3(0, 0.13, 0), new THREE.Vector3(0, 0.55, 0), 0.025, m.orange, 6);
    this.dishPivot.add(receiver);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), m.warmWindow);
    tip.position.y = 0.58;
    this.dishPivot.add(tip);
  }

  BuildTanks() {
    const m = this.materials;
    for (let index = 0; index < this.identity.station.tankCount; index += 1) {
      const angle = (index / this.identity.station.tankCount) * Math.PI * 0.8 + 0.35;
      const tank = MakeBarrel(0.24, 1.05, index % 2 ? m.orange : m.ivory, 10);
      tank.position.set(-1.8 + index * 0.2, -0.85, Math.cos(angle) * 0.55);
      this.station.add(tank);
    }
  }

  BuildPipes() {
    const m = this.materials;
    const pipePoints = [
      new THREE.Vector3(-1.9, 0.42, 0.76),
      new THREE.Vector3(-0.95, 0.62, 0.9),
      new THREE.Vector3(0.22, 0.64, 0.86),
      new THREE.Vector3(1.25, 0.43, 0.72),
    ];
    for (let index = 0; index < pipePoints.length - 1; index += 1) {
      this.station.add(MakeRod(pipePoints[index], pipePoints[index + 1], 0.045, m.orange, 7));
    }
    for (const point of pipePoints) {
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), m.metal);
      joint.position.copy(point);
      this.station.add(joint);
    }
  }

  BuildBeacons() {
    for (const data of [
      { position: [-2.63, 0.67, 0], color: 0xff5d38, phase: 0 },
      { position: [1.42, 0.8, 0.55], color: 0x75e4d5, phase: 1.4 },
      { position: [0.15, -1.08, -0.25], color: 0xffba56, phase: 2.8 },
    ]) {
      const material = new THREE.MeshBasicMaterial({ color: data.color });
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), material);
      beacon.position.set(...data.position);
      this.station.add(beacon);
      const light = new THREE.PointLight(data.color, 1.4, 3.2, 2);
      beacon.add(light);
      this.blinkers.push({ object: beacon, light, kind: "beacon", phase: data.phase, speed: 2.2, minimum: 0.06 });
    }
  }

  BuildVisitor() {
    const visitor = this.identity.visitor;
    const ShiftedColor = (hex) => {
      const color = new THREE.Color(hex);
      color.offsetHSL(visitor.colorShift, 0, 0);
      return color;
    };

    this.visitorStyles = Object.freeze({
      freighter: Object.freeze({ body: ShiftedColor(0xb95532), accent: ShiftedColor(0xe2c58f), scale: 1 }),
      courier: Object.freeze({ body: ShiftedColor(0x2f8585), accent: ShiftedColor(0xf0d7a4), scale: 0.84 }),
      surveyor: Object.freeze({ body: ShiftedColor(0x7a6b91), accent: ShiftedColor(0x71c5bc), scale: 0.92 }),
    });
    this.shipBodyMaterial = new THREE.MeshStandardMaterial({
      color: this.visitorStyles.freighter.body,
      roughness: 0.54,
      metalness: 0.28,
      flatShading: true,
    });
    this.shipAccentMaterial = new THREE.MeshStandardMaterial({
      color: this.visitorStyles.freighter.accent,
      roughness: 0.65,
      metalness: 0.16,
      flatShading: true,
    });

    this.ship = new THREE.Group();
    this.station.add(this.ship);
    const body = MakeBarrel(0.39, 1.55, this.shipBodyMaterial, 12);
    AddEdges(body);
    this.ship.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.39, 0.72, 12), this.shipAccentMaterial);
    nose.rotation.z = Math.PI / 2;
    nose.position.x = -1.12;
    this.ship.add(nose);
    this.shipNose = nose;
    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 6),
      this.materials.window.clone(),
    );
    cockpit.scale.set(1.35, 0.68, 0.82);
    cockpit.position.set(-0.48, 0.29, 0);
    this.ship.add(cockpit);
    this.shipCockpit = cockpit;
    this.shipCabinLight = new THREE.PointLight(0x7de2d4, 0.25, 3.2, 2);
    this.shipCabinLight.position.set(-0.25, 0.08, 0.12);
    cockpit.add(this.shipCabinLight);
    const engine = MakeBarrel(0.31, 0.28, this.materials.dark, 12);
    engine.position.x = 0.9;
    this.ship.add(engine);

    this.shipCargo = new THREE.Group();
    this.ship.add(this.shipCargo);
    // A permanent pallet rack stays on the freighter after the visible crates
    // are unloaded. It is structure, not a substitute cargo silhouette.
    for (const side of [-1, 1]) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.68, 0.2), this.materials.dark);
      rack.position.set(-0.05, 0.03, side * 0.39);
      this.shipCargo.add(rack);
      for (const y of [-0.33, 0.39]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.055, 0.28), this.materials.orange);
        rail.position.set(-0.05, y, side * 0.52);
        this.shipCargo.add(rail);
      }
    }

    this.shipCourier = new THREE.Group();
    this.ship.add(this.shipCourier);
    // Courier-only fittings keep the common docking hull while giving the fast
    // dispatch craft a compact, swept silhouette and a readable delivery bay.
    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.055, 0.32), this.shipBodyMaterial);
      fin.position.set(0.28, side * 0.4, -0.03);
      fin.rotation.z = side * -0.17;
      fin.rotation.y = -0.16;
      this.shipCourier.add(fin);
      const nacelle = MakeBarrel(0.105, 0.58, this.shipBodyMaterial, 8);
      nacelle.position.set(0.46, side * 0.43, -0.02);
      this.shipCourier.add(nacelle);
      const nacelleCap = MakeBarrel(0.125, 0.09, this.materials.dark, 8);
      nacelleCap.position.set(0.76, side * 0.43, -0.02);
      this.shipCourier.add(nacelleCap);
    }
    const courierTail = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.055), this.shipBodyMaterial);
    courierTail.position.set(0.55, 0.3, 0);
    courierTail.rotation.z = -0.22;
    this.shipCourier.add(courierTail);

    this.courierDispatchBay = new THREE.Group();
    this.courierDispatchBay.position.set(-0.25, 0.05, 0.37);
    this.shipCourier.add(this.courierDispatchBay);
    const bayInterior = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.44, 0.02), this.materials.black);
    bayInterior.position.z = 0.075;
    this.courierDispatchBay.add(bayInterior);
    for (const y of [-0.25, 0.25]) {
      const guide = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.035, 0.12), this.materials.dark);
      guide.position.set(0.23, y, 0.13);
      this.courierDispatchBay.add(guide);
    }
    // Deep side walls meet the curved hull; the payload emerges through their
    // opening instead of being created in front of a solid plate.
    for (const x of [-0.245, 0.245]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.5, 0.36), this.materials.dark);
      jamb.position.set(x, 0, -0.02); this.courierDispatchBay.add(jamb);
    }
    for (const y of [-0.23, 0.23]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.055, 0.36), this.materials.dark);
      jamb.position.set(0, y, -0.02); this.courierDispatchBay.add(jamb);
    }
    const bayDoor = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.43, 0.055), this.shipBodyMaterial);
    bayDoor.position.z = 0.18;
    this.courierDispatchBay.add(bayDoor);
    this.courierDispatchBayDoor = bayDoor;
    const dispatchMarkMaterial = new THREE.MeshStandardMaterial({
      color: 0xffc86b,
      emissive: 0xc96a22,
      emissiveIntensity: 1.5,
      roughness: 0.4,
    });
    for (const offset of [-0.075, 0.075]) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.018), dispatchMarkMaterial);
      mark.position.set(offset * 0.25, offset, 0.035);
      mark.rotation.z = -0.55;
      bayDoor.add(mark);
    }

    this.shipSurvey = new THREE.Group();
    this.ship.add(this.shipSurvey);
    const sensorMast = MakeRod(
      new THREE.Vector3(0.05, 0.28, 0),
      new THREE.Vector3(0.05, 0.72, 0),
      0.035,
      this.materials.metal,
      6,
    );
    this.shipSurvey.add(sensorMast);
    const sensorRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.035, 6, 12),
      this.shipAccentMaterial,
    );
    sensorRing.position.set(0.05, 0.75, 0);
    sensorRing.rotation.x = Math.PI / 2;
    this.shipSurvey.add(sensorRing);
    const sensorCore = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), this.materials.window);
    sensorCore.position.set(0.05, 0.75, 0);
    this.shipSurvey.add(sensorCore);

    this.shipExhaustMaterial = new THREE.MeshBasicMaterial({
      color: 0x72d9d1,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shipExhaust = new THREE.Mesh(new THREE.ConeGeometry(0.23, 1.2, 9), this.shipExhaustMaterial);
    this.shipExhaust.rotation.z = -Math.PI / 2;
    this.shipExhaust.position.x = 1.55;
    this.ship.add(this.shipExhaust);

    // Maneuvering jets are visual only; the existing scripted route remains unchanged.
    this.shipRcs = [];
    const rcsPorts = [];
    for (const end of [
      { x: -0.9, direction: -1, group: "fore" },
      { x: 0.72, direction: 1, group: "aft" },
    ]) {
      for (const radial of [
        { y: -0.28, z: 0 },
        { y: 0.28, z: 0 },
        { y: 0, z: -0.28 },
        { y: 0, z: 0.28 },
      ]) rcsPorts.push({ ...end, ...radial });
    }
    for (const port of rcsPorts) {
      const nozzle = MakeBarrel(0.065, 0.15, this.materials.dark, 7);
      nozzle.position.set(port.x, port.y, port.z);
      this.ship.add(nozzle);
      const material = new THREE.MeshBasicMaterial({
        color: 0x9debe3,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38, 7), material);
      plume.rotation.z = port.direction > 0 ? -Math.PI / 2 : Math.PI / 2;
      plume.position.set(port.x + port.direction * 0.21, port.y, port.z);
      plume.visible = false;
      this.ship.add(plume);
      this.shipRcs.push({ plume, material, group: port.group, z: port.z, direction: port.direction, phaseOffset: this.shipRcs.length * 1.7 });
    }
    this.ship.position.set(9, 2.4, 3.7);
    this.currentVisitorType = "";
  }

  BuildRobot() {
    const m = this.materials;
    this.robotHome = new THREE.Vector3(-0.2, 1.16, 0.72);
    this.robotWork = new THREE.Vector3(3.55, -0.27, 1.05);
    this.robotCargoDrop = new THREE.Vector3(1.2, 0.15, 1.65);
    this.robotDispatchPickup = new THREE.Vector3(3.23, -0.27, 0.95);
    this.robotDispatchDrop = new THREE.Vector3(0.98, 0.15, 1.65);
    this.robotAntennaSafe = new THREE.Vector3(-0.72, 1.18, 0.76);
    this.robotSeasonalInstall = new THREE.Vector3(...SERVICE_DECK_ANCHORS.pipSeasonalWork);
    this.robotPhantomWork = new THREE.Vector3(-2.22, 1.58, 1.48);
    this.robotPhantomSearch = new THREE.Vector3(-1.0, 1.72, 1.38);
    this.robotRemembranceWork = new THREE.Vector3(...SERVICE_DECK_ANCHORS.pipRemembranceWork);
    this.robotTaskTargets = Object.freeze({
      // The light's service face points toward +Z; Pip works from that side.
      "repair-light": new THREE.Vector3(0.05, 0.3, 1.38),
      "adjust-antenna": new THREE.Vector3(0.08, 1.38, 0.48),
      "cargo-transfer": this.robotWork,
      "seasonal-cargo": this.robotWork,
      "seasonal-install": this.robotSeasonalInstall,
      "phantom-visitor": this.robotPhantomWork,
      "lights-of-remembrance": this.robotRemembranceWork,
      "dispatch-exchange": this.robotDispatchPickup,
      "survey-sync": new THREE.Vector3(0.08, 1.38, 0.48),
      "stubborn-antenna": new THREE.Vector3(0.08, 1.38, 0.48),
    });

    const chargingPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.42, 0.065, 12),
      m.dark,
    );
    chargingPad.position.set(this.robotHome.x, 0.86, this.robotHome.z);
    this.station.add(chargingPad);
    const chargingRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.27, 0.025, 6, 14),
      m.warmWindow.clone(),
    );
    chargingRing.rotation.x = Math.PI / 2;
    chargingRing.position.y = 0.04;
    chargingPad.add(chargingRing);
    this.chargingRing = chargingRing;
    this.chargingRingMaterial = chargingRing.material;

    this.dreamCompositor = new DreamCompositor(this.scene);
    this.dreamVisual = new AntennaDreamVisual(this.dreamCompositor.scene);
    this.phantomDreamVisual = new PhantomDreamVisual(this.dreamCompositor.scene);
    this.dreamVisuals = [this.dreamVisual, this.phantomDreamVisual];

    this.robot = new THREE.Group();
    this.station.add(this.robot);
    this.robot.scale.setScalar(0.84);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.62, 0.42), m.teal);
    torso.position.y = 0.36;
    AddEdges(torso, 0x86c9c1, 0.36);
    this.robot.add(torso);
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.18), m.dark);
    backpack.position.set(0, 0.4, -0.28);
    this.robot.add(backpack);
    const chestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.27, 0.035), m.orange);
    chestPanel.position.set(0, 0.4, 0.23);
    this.robot.add(chestPanel);
    this.robotStatusMaterial = new THREE.MeshStandardMaterial({
      color: 0xffbd67,
      emissive: 0xff7138,
      emissiveIntensity: 1.8,
      roughness: 0.24,
    });
    this.robotStatusLight = new THREE.Mesh(new THREE.CircleGeometry(0.055, 10), this.robotStatusMaterial);
    this.robotStatusLight.position.set(0, 0.42, 0.252);
    this.robot.add(this.robotStatusLight);

    this.robotHead = new THREE.Group();
    this.robotHead.position.y = 0.83;
    this.robot.add(this.robotHead);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.37, 0.39), m.ivory);
    AddEdges(head, 0x647a79, 0.5);
    this.robotHead.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.15, 0.035), m.black);
    visor.position.set(0, 0.015, 0.207);
    this.robotHead.add(visor);
    this.robotEyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xa2f7e3,
      emissive: 0x62f0d0,
      emissiveIntensity: 3.4,
      roughness: 0.16,
    });
    this.robotEye = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.065, 0.025), this.robotEyeMaterial);
    this.robotEye.position.set(0, 0.015, 0.232);
    this.robotHead.add(this.robotEye);
    this.robotEyeLight = new THREE.PointLight(0x70efd7, 0.45, 1.35, 2);
    this.robotEyeLight.position.set(0, 0, 0.28);
    this.robotHead.add(this.robotEyeLight);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 5), m.orange);
      ear.scale.set(0.55, 1, 1);
      ear.position.x = side * 0.27;
      this.robotHead.add(ear);
    }
    const antenna = MakeRod(new THREE.Vector3(0.13, 0.16, 0), new THREE.Vector3(0.2, 0.39, 0), 0.025, m.metal, 6);
    this.robotHead.add(antenna);
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 5), m.warmWindow);
    antennaTip.position.set(0.2, 0.4, 0);
    this.robotHead.add(antennaTip);

    this.robotArms = [];
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.35, 0.59, 0.015);
      this.robot.add(shoulder);
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 6), m.orange);
      shoulder.add(shoulderCap);
      const upperEnd = new THREE.Vector3(side * 0.035, -0.23, 0.025);
      shoulder.add(MakeRod(new THREE.Vector3(), upperEnd, 0.06, m.metal, 7));
      const elbow = new THREE.Group();
      elbow.position.copy(upperEnd);
      shoulder.add(elbow);
      elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), m.orange));
      const forearmEnd = new THREE.Vector3(side * 0.045, -0.23, 0.075);
      elbow.add(MakeRod(new THREE.Vector3(), forearmEnd, 0.052, m.metal, 7));
      const hand = new THREE.Group();
      hand.position.copy(forearmEnd);
      elbow.add(hand);
      hand.add(new THREE.Mesh(new THREE.SphereGeometry(0.095, 7, 5), m.ivory));
      const armData = { shoulder, elbow, hand, side };
      this.robotArms.push(armData);

      if (side < 0) {
        this.robotTool = new THREE.Group();
        hand.add(this.robotTool);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.24, 0.065), m.dark);
        handle.position.y = -0.12;
        this.robotTool.add(handle);
        const toolHead = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.075, 0.09), m.orange);
        toolHead.position.set(0, -0.25, 0.025);
        this.robotTool.add(toolHead);
        this.robotToolGlow = new THREE.Mesh(
          new THREE.SphereGeometry(0.095, 8, 6),
          new THREE.MeshBasicMaterial({
            color: 0x9effe8,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        this.robotToolGlow.position.set(0, -0.29, 0.08);
        this.robotTool.add(this.robotToolGlow);
        this.robotTool.visible = false;
      }
    }
    for (const side of [-1, 1]) {
      const leg = MakeRod(new THREE.Vector3(side * 0.13, 0.1, 0), new THREE.Vector3(side * 0.17, -0.25, 0.03), 0.065, m.dark, 7);
      this.robot.add(leg);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.28), m.metal);
      boot.position.set(side * 0.18, -0.3, 0.08);
      this.robot.add(boot);
    }

    this.robotCargoGrip = new THREE.Object3D();
    this.robotCargoGrip.position.set(0, 0.38, 0.53);
    this.robot.add(this.robotCargoGrip);
    this.robotCargoWorldPosition = new THREE.Vector3();
    this.pipPoseName = "standby";
    this.pipReactionName = "quiet";
    this.robot.position.copy(this.robotHome);
  }

  resize(width, height, pixelRatio) {
    this.width = width;
    this.height = height;
    this.pixelRatio = pixelRatio;
    this.camera.aspect = width / height;
    this.camera.fov = this.camera.aspect < 1.35 ? 45 : 39;
    this.camera.updateProjectionMatrix();
    this.cameraFraming.setViewport(width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
  }

  update(stepSeconds, eventState, environmentState = DEFAULT_ENVIRONMENT, frameSeconds = stepSeconds) {
    this.elapsed += stepSeconds;
    const time = this.elapsed;
    UpdateEnvironmentVisuals(this, environmentState);
    this.planetGlobe.rotation.y = environmentState.planetRotationPhase * Math.PI * 2;
    this.planet.rotation.z = environmentState.seasonalSunTilt * 0.08 + Math.sin(time * 0.025) * 0.006;
    this.stars.rotation.y = time * 0.0018;

    const antennaState = eventState.antennaState || "tracking";
    const incident = eventState.storyIncident;
    const incidentProgress = incident ? incident.progress : 0;
    const incidentVariant = incident ? incident.variant : 0;
    const direction = this.identity.station.dishDirection;
    this.antennaRepairPlate.visible = Boolean(incident && incident.repairPlateVisible);
    if (antennaState === "incident-stutter") {
      const stutter = Math.sin(time * (incidentVariant === 1 ? 9 : 6.5)) * 0.18;
      const stick = incidentProgress > 0.6 ? 0.38 : 0;
      this.dishPivot.rotation.y = direction * (0.86 + stutter + stick);
      this.dishPivot.rotation.z = 0.58 + Math.sin(time * 5.4) * 0.09;
      this.antennaDriveIndicatorMaterial.color.setHex(0xff9a52);
      this.antennaDriveIndicatorMaterial.emissive.setHex(0xf04725);
      this.antennaDriveIndicatorMaterial.emissiveIntensity = 1.8 + Math.sin(time * 8) * 0.8;
    } else if (antennaState === "incident-stuck" || antennaState === "incident-stuck-again") {
      this.dishPivot.rotation.y = direction * (antennaState === "incident-stuck" ? 1.22 : 1.58);
      this.dishPivot.rotation.z = antennaState === "incident-stuck" ? 0.61 : 0.72;
      this.antennaDriveIndicatorMaterial.color.setHex(0xff8552);
      this.antennaDriveIndicatorMaterial.emissive.setHex(0xdc3f27);
      this.antennaDriveIndicatorMaterial.emissiveIntensity = 1.8;
    } else if (antennaState === "incident-false-normal") {
      this.dishPivot.rotation.y = direction * (1.32 + Math.sin(incidentProgress * Math.PI) * 0.13);
      this.dishPivot.rotation.z = 0.3 + Math.sin(incidentProgress * Math.PI * 2) * 0.035;
      this.antennaDriveIndicatorMaterial.color.setHex(0x6ce5d5);
      this.antennaDriveIndicatorMaterial.emissive.setHex(0x2dcab7);
      this.antennaDriveIndicatorMaterial.emissiveIntensity = 1.3;
    } else if (antennaState === "incident-runaway-spin") {
      this.dishPivot.rotation.y = direction * (1.58 + incidentProgress * Math.PI * 6);
      this.dishPivot.rotation.z = 0.72 + Math.sin(incidentProgress * Math.PI * 8) * 0.16;
      this.antennaDriveIndicatorMaterial.color.setHex(0xff7853);
      this.antennaDriveIndicatorMaterial.emissive.setHex(0xf04424);
      this.antennaDriveIndicatorMaterial.emissiveIntensity = 2.1;
    } else if (antennaState === "incident-repairing") {
      const settle = Math.max(0, (incidentProgress - 0.35) / 0.65);
      this.dishPivot.rotation.y = direction * (1.58 - settle * 0.24);
      this.dishPivot.rotation.z = 0.72 - settle * 0.42;
      this.antennaDriveIndicatorMaterial.color.setHex(0xffb058);
      this.antennaDriveIndicatorMaterial.emissive.setHex(0xec6a2f);
      this.antennaDriveIndicatorMaterial.emissiveIntensity = 1.15;
    } else if (antennaState === "incident-settling" || antennaState === "incident-patched-tracking") {
      this.dishPivot.rotation.y = direction * (1.34 + Math.sin(time * 0.46) * 0.16);
      this.dishPivot.rotation.z = 0.28 + Math.sin(time * 0.25) * 0.035;
      this.antennaDriveIndicatorMaterial.color.setHex(0x6ce5d5);
      this.antennaDriveIndicatorMaterial.emissive.setHex(0x2dcab7);
      this.antennaDriveIndicatorMaterial.emissiveIntensity = 1.25;
    } else if (antennaState === "drifted") {
      this.dishPivot.rotation.y = 1.18 + Math.sin(time * 0.08) * 0.04;
      this.dishPivot.rotation.z = 0.68;
    } else if (antennaState === "adjusting") {
      const alignment = SmoothStep(eventState.pipTaskProgress);
      this.dishPivot.rotation.y = 1.18 * (1 - alignment) + time * 0.12 * alignment;
      this.dishPivot.rotation.z = 0.68 - alignment * 0.4;
    } else if (antennaState === "synchronizing") {
      this.dishPivot.rotation.y = time * 0.72 * this.identity.station.dishDirection;
      this.dishPivot.rotation.z = 0.18 + Math.sin(time * 0.9) * 0.06;
    } else {
      this.dishPivot.rotation.y = time * 0.31 * this.identity.station.dishDirection;
      this.dishPivot.rotation.z = 0.28 + Math.sin(time * 0.18) * 0.08;
      this.antennaDriveIndicatorMaterial.color.setHex(0x6ce5d5);
      this.antennaDriveIndicatorMaterial.emissive.setHex(0x2dcab7);
      this.antennaDriveIndicatorMaterial.emissiveIntensity = 1.2;
    }
    for (const panel of this.panelPivots) {
      panel.pivot.rotation.z = this.identity.station.panelTilt + Math.sin(time * 0.075 + panel.side) * 0.07;
    }
    for (const blinker of this.blinkers) {
      const wave = (Math.sin(time * blinker.speed + blinker.phase) + 1) * 0.5;
      if (blinker.kind === "window") {
        const glow = 0.9 + wave * 0.1;
        blinker.object.material.emissiveIntensity = (1.8 + environmentState.artificialLightBoost * 3) * glow;
        blinker.object.scale.setScalar(0.98 + glow * 0.04);
        continue;
      }
      const pulse = Math.max(blinker.minimum, wave);
      if (blinker.object.material.emissiveIntensity !== undefined) {
        blinker.object.material.emissiveIntensity = pulse * 2.8;
      }
      blinker.object.scale.setScalar(0.86 + pulse * 0.22);
      if (blinker.light) blinker.light.intensity = pulse * 2.4;
    }

    this.UpdateShip(eventState);
    UpdatePip(this, eventState);
    const charging = eventState.pipTaskId === "charging" || eventState.pipTaskId === "dream-antenna" || eventState.pipTaskId === "dream-phantom";
    const chargePulse = 0.55 + 0.45 * Math.sin(time * 1.1);
    this.chargingRingMaterial.emissiveIntensity = charging ? 2.1 + chargePulse * 1.9 : 1.2;
    UpdateStationDetails(this, eventState);
    this.seasonalServiceDeckVisual.update(eventState);
    this.autumn2026Visual.Update(eventState);
    this.phantomVisitorVisual.update(eventState.phantomVisitor);
    this.remembranceVisual.update(eventState);

    this.cameraFraming.update(time, frameSeconds, this.robot);
    const activeCamera = this.cameraFraming.getActiveCamera();
    this.dreamVisual.update(eventState.dream, activeCamera, this.robotHead);
    this.phantomDreamVisual.update(eventState.dream, activeCamera, this.robotHead);
  }

  ConfigureVisitor(visitorType, visitId = "") {
    const visitorKey = visitorType + ":" + visitId;
    if (visitorKey === this.currentVisitorType) return;
    const style = this.visitorStyles[visitorType] || this.visitorStyles.freighter;
    const identityRandom = CreateRandom(DeriveSeed(this.config.worldSeed, "visitor-instance-v1-" + visitorKey));
    const hueShift = identityRandom() * 0.08 - 0.04;
    const lightShift = identityRandom() * 0.08 - 0.04;
    this.shipBodyMaterial.color.copy(style.body).offsetHSL(hueShift, 0, lightShift);
    this.shipAccentMaterial.color.copy(style.accent).offsetHSL(hueShift * 0.5, 0, -lightShift * 0.45);
    this.ship.scale.setScalar(style.scale);
    this.shipNose.material = visitorType === 'courier' ? this.shipBodyMaterial : this.shipAccentMaterial;
    this.shipCockpit.material.emissiveIntensity = visitorType === 'courier' ? 0.35 : 2.4;
    this.shipCockpit.material.color.setHex(visitorType === 'courier' ? 0x24545b : 0x87d6c9);
    this.shipCargo.visible = visitorType === "freighter";
    this.shipCourier.visible = visitorType === "courier";
    this.shipSurvey.visible = visitorType === "surveyor";
    this.currentVisitorType = visitorKey;
  }

  UpdateShip(state) {
    this.ship.visible = state.shipVisible;
    if (!state.shipVisible) return;
    this.ConfigureVisitor(state.visitorType, state.visitId);
    // Both permanent racks remain after the manifest has been unloaded.
    this.shipCargo.visible = state.visitorType === "freighter";

    const laneOffset = state.visitorType === "surveyor"
      ? -0.7
      : state.visitorType === "courier"
        ? 0.55
        : 0;

    if (state.phase === "approach") {
      this.ship.position.lerpVectors(this.shipApproach, this.shipDock, state.shipTravel);
      this.ship.position.x += 0.6 * state.shipTravel;
      this.ship.position.y += Math.sin(state.progress * Math.PI) * 0.5;
      this.ship.position.z += laneOffset * (1 - state.shipTravel);
      this.ship.rotation.set(
        0.05 * (1 - state.progress),
        -0.25 * (1 - state.progress),
        (-0.12 + laneOffset * 0.08) * (1 - state.progress),
      );
    } else if (state.phase === "departure") {
      const outward = state.progress;
      const backoutPortion = 0.36;
      const turnPortion = 0.34;
      const launchStart = backoutPortion + turnPortion;
      if (outward < backoutPortion) {
        // Reverse straight out through the docking corridor before turning away.
        this.ship.position.lerpVectors(
          this.shipDock,
          this.shipBackout,
          EaseInOut(outward / backoutPortion),
        );
      } else if (outward < launchStart) {
        // Clear the berth, rotate in place, then light the main engine to depart.
        this.ship.position.copy(this.shipBackout);
      } else {
        const departureProgress = (outward - launchStart) / (1 - launchStart);
        this.ship.position.lerpVectors(this.shipBackout, this.shipDeparture, EaseInOut(departureProgress));
      }
      const turn = Math.max(0, Math.min(1, (outward - backoutPortion) / turnPortion));
      const heading = Math.atan2(this.shipDeparture.z - this.shipBackout.z, this.shipBackout.x - this.shipDeparture.x);
      const targetYaw = heading < 0 ? heading + Math.PI * 2 : heading;
      const easedTurn = turn * turn * turn * (10 + turn * (-15 + turn * 6));
      this.ship.rotation.set(0, targetYaw * easedTurn, 0);
    } else if (state.phase === 'dock') {
      this.ship.position.copy(this.shipDock);
      this.ship.position.x += 0.6 * (1 - SmoothStep(state.progress));
      this.ship.rotation.set(0, 0, 0);
    } else {
      this.ship.position.copy(this.shipDock);
      this.ship.rotation.set(0, 0, 0);
    }

    if (state.visitorType === "surveyor") {
      this.shipSurvey.rotation.y = this.elapsed * 0.8;
    }
    this.shipCargo.position.y = 0;

    const departureOutward = state.phase === "departure" ? state.progress : 0;
    // Stay on the main engine long enough to enter the tighter camera frame, then
    // hand the final braking/alignment portion to the forward RCS bank.
    const mainDuringArrival = state.phase === "approach" && state.shipTravel < 0.82;
    const mainAfterTurn = state.phase === "departure" && departureOutward >= 0.70;
    const mainFiring = mainDuringArrival || mainAfterTurn;
    this.shipExhaust.visible = mainFiring;
    if (mainFiring) {
      const thrustPulse = 0.72 + Math.sin(this.elapsed * 17) * 0.12;
      this.shipExhaust.scale.set(1, thrustPulse, 1);
      this.shipExhaustMaterial.opacity = 0.78;
    } else {
      this.shipExhaustMaterial.opacity = 0;
    }

    // Final docking, berth separation, and the turn are RCS-only maneuvers.
    const rcsManeuvering = (state.phase === "approach" && !mainDuringArrival) ||
      state.phase === 'dock' || (state.phase === "departure" && !mainAfterTurn);
    const turning = state.phase === "departure" && departureOutward >= 0.36 && departureOutward < 0.70;
    const turnProgress = (departureOutward - 0.36) / 0.34;
    // Axial jets on opposite sides form a torque couple, with zero net force.
    // Reverse that couple halfway through the eased yaw to brake to rest.
    const torqueSign = turnProgress < 0.5 ? 1 : -1;
    const activeGroup = state.phase === 'dock' ? (state.progress < 0.5 ? 'aft' : 'fore')
      : state.phase === 'departure' && departureOutward > 0.18 ? 'aft' : 'fore';
    for (const rcs of this.shipRcs) {
      const firing = rcsManeuvering && (turning
        ? Math.sign(-rcs.z * rcs.direction) === torqueSign && Math.abs(turnProgress - 0.5) > 0.025
        : rcs.group === activeGroup);
      const pulse = turning
        ? Math.abs(60 * turnProgress * (1 - turnProgress) * (1 - 2 * turnProgress)) / 5.78
        : 0.72 + Math.sin(this.elapsed * 22 + rcs.phaseOffset) * 0.2;
      rcs.plume.visible = firing;
      if (firing) {
        rcs.plume.scale.set(1, pulse, 1);
        rcs.material.opacity = 0.44 + pulse * 0.3;
      }
    }
  }

  render() {
    this.dreamCompositor.prepare(this.renderer, this.cameraFraming.getActiveCamera(), this.dreamVisuals);
    this.renderer.render(this.scene, this.cameraFraming.getActiveCamera());
  }

  getPipDiagnostics() {
    return { pose: this.pipPoseName || "standby", reaction: this.pipReactionName || "quiet" };
  }

  getCameraDiagnostics() {
    return this.cameraFraming.getDiagnostics();
  }

  getDiagnostics() {
    const info = this.renderer.info.render;
    return { calls: info.calls, triangles: info.triangles, points: info.points, lines: info.lines };
  }
}
