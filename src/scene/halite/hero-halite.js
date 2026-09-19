/**
 * Halite fluid-inclusion hero — procedural iron-cross cavities + microbes.
 * Physical scale: crystal ≈ 2 mm, bacteria = 1 µm diameter.
 * Camera: overview → pause on pattern → deep dive (Theatre.js) + live scale bar.
 */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { getProject, types } from "@theatre/core";
import { setPauseButtonState, setPanButtonState } from "./hero-info.js";

/** 1 Three.js unit = 20 µm. Crystal long axis = 2 mm. Bacteria diameter = 1 µm. */
const UM_PER_UNIT = 20;
const CRYSTAL = { sx: 100, sy: 58, sz: 42 }; // 2.00 × 1.16 × 0.84 mm
const BACTERIA_DIAM_UM = 1;
const BACTERIA_R = BACTERIA_DIAM_UM / 2 / UM_PER_UNIT; // 0.025 units
const ARMS = "x";
const DENSITY = "sparse";
/** Cap microbes — densest around the deep-zoom habitat, sparse elsewhere. */
const MAX_MICROBES = 150;
/** Inclusions farther than this from HABITAT get no microbes. */
const MICROBE_HOT_RADIUS = 40;

/** Featured cubic inclusion for deep-zoom (the “main” cavity in frame). ~14 µm. */
const HABITAT = { x: 30.8, y: 0.9, z: 0.3, sx: 0.72, sy: 0.78, sz: 0.68 };
/** Tall neighbor for context — parked inboard (−X) so the +X orbit clears it. */
const HABITAT_NEIGHBOR = { x: 27.6, y: 0.45, z: -0.85, sx: 0.9, sy: 2.3, sz: 0.75 };

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inIronCross(x, y, arms = ARMS) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  if (ax < 1.0 && ay < 1.0) return true;
  const angle = Math.atan2(ay, ax);
  const half = (30 * Math.PI) / 180;
  if (angle <= half) return true;
  if (arms === "xy" && angle >= Math.PI / 2 - half) return true;
  return false;
}

function overlaps(a, b, pad = 0.18) {
  return (
    Math.abs(a.x - b.x) * 2 < a.sx + b.sx + pad &&
    Math.abs(a.y - b.y) * 2 < a.sy + b.sy + pad &&
    Math.abs(a.z - b.z) * 2 < a.sz + b.sz + pad
  );
}

function generateInclusions(rng) {
  const { sx, sy, sz } = CRYSTAL;
  const hx = sx * 0.46;
  const hy = sy * 0.42;
  const hz = sz * 0.38;
  const count = DENSITY === "dense" ? 468 : 302; // −15% for frame pacing
  const boxes = [];

  for (let i = 0; i < count * 14 && boxes.length < count; i++) {
    const x = (rng() * 2 - 1) * hx;
    const y = (rng() * 2 - 1) * hy;
    const z = (rng() * 2 - 1) * hz;
    if (!inIronCross(x, y)) continue;

    const roll = rng();
    let bx;
    let by;
    let bz;
    if (roll < 0.34) {
      const s = 0.16 + rng() * 0.22; // ~3–8 µm squares
      bx = by = bz = s;
    } else if (roll < 0.72) {
      bx = 0.14 + rng() * 0.22; // ~3–7 µm
      by = 0.35 + rng() * 0.85; // ~7–24 µm elongated
      bz = 0.12 + rng() * 0.18;
    } else {
      bx = 0.22 + rng() * 0.38; // ~4–12 µm
      by = 0.18 + rng() * 0.32;
      bz = 0.14 + rng() * 0.22;
    }

    if (Math.abs(x) + bx / 2 > hx * 0.98) continue;
    if (Math.abs(y) + by / 2 > hy * 0.98) continue;
    if (Math.abs(z) + bz / 2 > hz * 0.98) continue;

    const cand = { x, y, z, sx: bx, sy: by, sz: bz };
    if (boxes.some((b) => overlaps(b, cand))) continue;
    boxes.push(cand);
  }

  boxes.push({ ...HABITAT });
  boxes.push({ ...HABITAT_NEIGHBOR });
  return boxes;
}

function distToHabitat(inc) {
  return Math.hypot(inc.x - HABITAT.x, inc.y - HABITAT.y, inc.z - HABITAT.z);
}

function isHabitatInc(inc) {
  return (
    Math.abs(inc.x - HABITAT.x) < 0.01 &&
    Math.abs(inc.y - HABITAT.y) < 0.01 &&
    Math.abs(inc.z - HABITAT.z) < 0.01
  );
}

function microbeCountFor(inc) {
  const minDim = Math.min(inc.sx, inc.sy, inc.sz);
  if (minDim < BACTERIA_R * 4) return 0;

  // Featured cavity: full population for the tight shot
  if (isHabitatInc(inc)) return 12;

  const d = distToHabitat(inc);
  // Only populate inclusions near the zoom target — far cavities stay empty
  if (d > MICROBE_HOT_RADIUS) return 0;

  const vol = inc.sx * inc.sy * inc.sz;
  if (d < 4) {
    if (vol < 0.2) return 1;
    if (vol < 0.8) return 2;
    return Math.min(4, 2 + Math.floor(vol * 0.5));
  }
  // Outer hot ring: at most one microbe for a hint of life
  return vol > 0.02 ? 1 : 0;
}

function boxEdges(sx, sy, sz) {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const c = [
    [-hx, -hy, -hz],
    [hx, -hy, -hz],
    [hx, hy, -hz],
    [-hx, hy, -hz],
    [-hx, -hy, hz],
    [hx, -hy, hz],
    [hx, hy, hz],
    [-hx, hy, hz],
  ];
  const pairs = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  const pos = [];
  for (const [i, j] of pairs) pos.push(...c[i], ...c[j]);
  return pos;
}

function spawnMicrobes(inclusions, rng) {
  // Habitat first, then nearest inclusions — skip the rest of the crystal
  const ranked = inclusions
    .map((inc) => ({ inc, n: microbeCountFor(inc), d: distToHabitat(inc) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => {
      const ah = isHabitatInc(a.inc) ? 1 : 0;
      const bh = isHabitatInc(b.inc) ? 1 : 0;
      if (ah !== bh) return bh - ah;
      if (a.d !== b.d) return a.d - b.d;
      return b.inc.sx * b.inc.sy * b.inc.sz - a.inc.sx * a.inc.sy * a.inc.sz;
    });

  const bugs = [];
  for (const { inc, n, d } of ranked) {
    if (bugs.length >= MAX_MICROBES) break;
    const take = Math.min(n, MAX_MICROBES - bugs.length);
    const hot = isHabitatInc(inc) || d < 4;
    for (let i = 0; i < take; i++) {
      const margin = BACTERIA_R * 2.2;
      const roomX = Math.max(0.01, inc.sx - margin);
      const roomY = Math.max(0.01, inc.sy - margin);
      const roomZ = Math.max(0.01, inc.sz - margin);
      const bug = {
        cav: inc,
        hot,
        x: inc.x + (rng() - 0.5) * roomX,
        y: inc.y + (rng() - 0.5) * roomY,
        z: inc.z + (rng() - 0.5) * roomZ,
        vx: rng() - 0.5,
        vy: rng() - 0.5,
        vz: rng() - 0.5,
        r: BACTERIA_R * (0.9 + rng() * 0.25),
      };
      const sp = Math.hypot(bug.vx, bug.vy, bug.vz) || 1;
      const s = 0.55 / sp;
      bug.vx *= s;
      bug.vy *= s;
      bug.vz *= s;
      bugs.push(bug);
    }
  }
  // Hot bugs first so time-sliced updates prefer the zoom target
  bugs.sort((a, b) => (b.hot ? 1 : 0) - (a.hot ? 1 : 0));
  bugs.forEach((b, i) => {
    b.idx = i;
  });
  return bugs;
}

function niceScaleUm(raw) {
  if (!(raw > 0) || !Number.isFinite(raw)) return 100;
  const exp = Math.floor(Math.log10(raw));
  const f = raw / 10 ** exp;
  const nice = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10;
  return nice * 10 ** exp;
}

function formatScale(um) {
  if (um >= 1000) {
    const mm = um / 1000;
    return mm >= 10 ? `${Math.round(mm)} mm` : `${parseFloat(mm.toFixed(2))} mm`;
  }
  if (um >= 10) return `${Math.round(um)} µm`;
  return `${parseFloat(um.toFixed(1))} µm`;
}

function mountScaleBar(host) {
  const root =
    host?.querySelector(".hero-info-root") ||
    host ||
    document.querySelector(".hero");
  if (!root) return null;
  let el = root.querySelector(".hero-scalebar");
  if (!el) {
    el = document.createElement("div");
    el.className = "hero-scalebar";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<span class="hero-scalebar-bar"></span><span class="hero-scalebar-label"></span>';
    root.appendChild(el);
  }
  return el;
}

/** Vertical microscope focus rack — marker tracks Z-focus during hunt holds. */
function mountFocusRack(host) {
  const root =
    host?.querySelector(".hero-info-root") ||
    host ||
    document.querySelector(".hero");
  if (!root) return null;
  let el = root.querySelector(".hero-focusrack");
  if (!el) {
    el = document.createElement("div");
    el.className = "hero-focusrack";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<span class="hero-focusrack-label">Focus</span>' +
      '<div class="hero-focusrack-track">' +
      '<span class="hero-focusrack-ticks"></span>' +
      '<span class="hero-focusrack-marker"></span>' +
      "</div>";
    root.appendChild(el);
  }
  return el;
}

export async function startHaliteHero(canvas, meta = {}) {
  const stateUrl = meta.theatreUrl || "/hero/halite-theatre.json";
  const stateRes = await fetch(stateUrl);
  if (!stateRes.ok) throw new Error(`Failed to load ${stateUrl}`);
  const theatreState = await stateRes.json();

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // composer handles presentation; MSAA + DOF is costly
    alpha: false,
    powerPreference: "high-performance",
  });
  const dprCap = 1.25;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setClearColor(0x060810, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060810);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 800);
  camera.position.set(48, 30, 195);
  camera.lookAt(0, 0, 0);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bokehPass = new BokehPass(scene, camera, {
    focus: 195,
    aperture: 0.00012,
    maxblur: 0.009,
  });
  composer.addPass(bokehPass);
  // DOF at 1× pixel ratio — biggest win during zoom
  const DOF_PR = 1;

  // Soft stage lights — keep host faces from washing pink inclusions pale
  const ambient = new THREE.AmbientLight(0xc8d0dc, 0.45);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xf2f4f8, 0.75);
  key.position.set(60, 90, 80);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa8b0c0, 0.35);
  fill.position.set(-80, -30, -60);
  scene.add(fill);
  const rimLight = new THREE.PointLight(0xd8dee8, 0.35, 400);
  rimLight.position.set(-50, 35, 70);
  scene.add(rimLight);
  const hemi = new THREE.HemisphereLight(0xe8eef6, 0x12141a, 0.28);
  scene.add(hemi);

  // Grade the void → interior so the dive doesn’t flip from navy stage to pink wash
  const STAGE_OUT = new THREE.Color(0x060810);
  const STAGE_IN = new THREE.Color(0x181018);
  const LIGHT_COOL = new THREE.Color(0xc8d0dc);
  const LIGHT_WARM = new THREE.Color(0xe8c8d4);
  const KEY_COOL = new THREE.Color(0xf2f4f8);
  const KEY_WARM = new THREE.Color(0xffe8f0);
  const FILL_COOL = new THREE.Color(0xa8b0c0);
  const FILL_WARM = new THREE.Color(0xc8a0b0);
  const HEMI_SKY_OUT = new THREE.Color(0xe8eef6);
  const HEMI_SKY_IN = new THREE.Color(0xf0d8e4);
  const HEMI_GND_OUT = new THREE.Color(0x12141a);
  const HEMI_GND_IN = new THREE.Color(0x1a1016);
  const _stageCol = new THREE.Color();
  let stageInside = 0;

  const root = new THREE.Group();
  scene.add(root);

  const hostGeo = new THREE.BoxGeometry(CRYSTAL.sx, CRYSTAL.sy, CRYSTAL.sz);
  // Quiet glass shell — low opacity + high roughness so faces don’t glaze over pinks
  const hostMat = new THREE.MeshStandardMaterial({
    color: 0xb8c0cc,
    roughness: 0.72,
    metalness: 0,
    transparent: true,
    opacity: 0.07,
    side: THREE.FrontSide,
    depthWrite: false,
  });
  const hostMesh = new THREE.Mesh(hostGeo, hostMat);
  const hostEdgeMat = new THREE.LineBasicMaterial({
    color: 0xc8d2e0,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    depthTest: false,
  });
  const hostEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(hostGeo, 20),
    hostEdgeMat
  );
  root.add(hostMesh);
  root.add(hostEdges);

  const rng = mulberry32(0x5ea15e);
  const inclusions = generateInclusions(rng);

  // Saturated unlit pink — same chroma at overview and deep zoom (no Standard wash)
  const cavityMat = new THREE.MeshBasicMaterial({
    color: 0xff6b9d,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  const cavityMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    cavityMat,
    inclusions.length
  );
  cavityMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  cavityMesh.frustumCulled = true;
  const _cavityDummy = new THREE.Object3D();
  const rimPositions = [];
  inclusions.forEach((inc, i) => {
    _cavityDummy.position.set(inc.x, inc.y, inc.z);
    _cavityDummy.scale.set(inc.sx, inc.sy, inc.sz);
    _cavityDummy.updateMatrix();
    cavityMesh.setMatrixAt(i, _cavityDummy.matrix);
    const local = boxEdges(inc.sx, inc.sy, inc.sz);
    for (let k = 0; k < local.length; k += 3) {
      rimPositions.push(local[k] + inc.x, local[k + 1] + inc.y, local[k + 2] + inc.z);
    }
  });
  cavityMesh.instanceMatrix.needsUpdate = true;
  root.add(cavityMesh);

  const rimGeo = new THREE.BufferGeometry();
  rimGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(rimPositions, 3)
  );
  // Stronger rim chroma so distant boxes read as pink, not pale lavender
  const rimMat = new THREE.LineBasicMaterial({
    color: 0xff4f8a,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  const rimLines = new THREE.LineSegments(rimGeo, rimMat);
  root.add(rimLines);

  function updateStageGrade(targetInside, dt) {
    const ease = 1 - Math.exp(-3.2 * dt);
    stageInside += (targetInside - stageInside) * ease;
    const u = stageInside;

    _stageCol.copy(STAGE_OUT).lerp(STAGE_IN, u);
    scene.background.copy(_stageCol);
    renderer.setClearColor(_stageCol, 1);

    ambient.color.copy(LIGHT_COOL).lerp(LIGHT_WARM, u);
    ambient.intensity = THREE.MathUtils.lerp(0.45, 0.58, u);
    key.color.copy(KEY_COOL).lerp(KEY_WARM, u);
    key.intensity = THREE.MathUtils.lerp(0.75, 0.55, u);
    fill.color.copy(FILL_COOL).lerp(FILL_WARM, u);
    fill.intensity = THREE.MathUtils.lerp(0.35, 0.42, u);
    rimLight.color.copy(LIGHT_COOL).lerp(LIGHT_WARM, u);
    rimLight.intensity = THREE.MathUtils.lerp(0.35, 0.28, u);
    hemi.color.copy(HEMI_SKY_OUT).lerp(HEMI_SKY_IN, u);
    hemi.groundColor.copy(HEMI_GND_OUT).lerp(HEMI_GND_IN, u);
    hemi.intensity = THREE.MathUtils.lerp(0.28, 0.38, u);

    // Outer crystal silhouette fades as the frame becomes “inside”
    hostEdgeMat.opacity = THREE.MathUtils.lerp(0.42, 0.06, u);
    hostMat.opacity = THREE.MathUtils.lerp(0.07, 0.035, u);
    // Slightly ease pink density so DOF doesn’t slam the grade
    cavityMat.opacity = THREE.MathUtils.lerp(0.28, 0.2, u);
    rimMat.opacity = THREE.MathUtils.lerp(0.88, 0.72, u);
  }

  const bacteria = spawnMicrobes(inclusions, rng);
  const hotBacteria = bacteria.filter((b) => b.hot);
  const bugMat = new THREE.MeshStandardMaterial({
    color: 0x7ecf9a,
    roughness: 0.4,
    metalness: 0.02,
    emissive: 0x2a6b45,
    emissiveIntensity: 0.7,
    transparent: false,
    depthTest: true,
    depthWrite: true,
  });
  const bugMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    bugMat,
    Math.max(1, bacteria.length)
  );
  bugMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bugMesh.frustumCulled = true;
  bugMesh.renderOrder = 3;
  root.add(bugMesh);
  const _dummy = new THREE.Object3D();
  bacteria.forEach((b, i) => {
    _dummy.position.set(b.x, b.y, b.z);
    _dummy.scale.setScalar(b.r);
    _dummy.updateMatrix();
    bugMesh.setMatrixAt(i, _dummy.matrix);
  });
  bugMesh.count = bacteria.length;
  bugMesh.instanceMatrix.needsUpdate = true;
  console.info(
    `[halite] ${inclusions.length} inclusions (instanced), ${bacteria.length} microbes (1 µm)`
  );

  // Depth pass: hide host + solid cavity fills. Solid cavity fronts make every
  // box stacked along a ray share the nearest depth → “behind stays sharp”.
  // Microbes + rim lines keep real per-object depths (planar focus).
  const _bokehRender = bokehPass.render.bind(bokehPass);
  bokehPass.render = (renderer, writeBuffer, readBuffer, deltaTime, maskActive) => {
    hostMesh.visible = false;
    hostEdges.visible = false;
    cavityMesh.visible = false;
    try {
      _bokehRender(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    } finally {
      hostMesh.visible = true;
      hostEdges.visible = true;
      cavityMesh.visible = true;
    }
  };

  const project = getProject("Halite Hero v21", { state: theatreState });
  const sheet = project.sheet("Zoom");
  const camObj = sheet.object("Camera", {
    position: { x: 48, y: 30, z: 195 },
    lookAt: { x: 0, y: 0, z: 0 },
    fov: types.number(38, { range: [8, 70] }),
  });

  let theatreCam = {
    position: { x: 48, y: 30, z: 195 },
    lookAt: { x: 0, y: 0, z: 0 },
    fov: 38,
  };
  camObj.onValuesChange((v) => {
    theatreCam = v;
  });
  await project.ready;

  const PLAY_RATE = 0.9;
  // Continuous loop: pattern → ease-in + CCW orbit → pull out → overview
  const playOpts = {
    iterationCount: Infinity,
    direction: "normal",
    rate: PLAY_RATE,
  };
  function playStory() {
    return sheet.sequence.play(playOpts).catch((err) => {
      // Interrupted by pause() is normal; log unexpected failures
      if (err && paused) return;
      if (err) console.warn("[halite] sequence.play interrupted", err);
    });
  }
  playStory();

  // Microscope focus-hunt — pattern only. During dive, focus stays on the subject.
  const FOCUS_HOLDS = [
    { start: 3.2, end: 5.4 }, // pattern (~2 mm)
  ];
  const FIELD_MM_MAX = 5; // only hunt when FOV ≤ 5 mm

  function activeFocusHold(seqPos) {
    for (const h of FOCUS_HOLDS) {
      if (seqPos >= h.start && seqPos <= h.end) return h;
    }
    return null;
  }

  /** Progress 0→1 through a hold, correct for alternate (reverse) playback. */
  let _prevSeqPos = 0;
  let _seqGoingForward = true;
  function microscopeHoldProgress(seqPos, hold) {
    if (seqPos >= _prevSeqPos) _seqGoingForward = true;
    else if (seqPos < _prevSeqPos) _seqGoingForward = false;
    _prevSeqPos = seqPos;
    const raw = (seqPos - hold.start) / Math.max(1e-4, hold.end - hold.start);
    const u = THREE.MathUtils.clamp(raw, 0, 1);
    return _seqGoingForward ? u : 1 - u;
  }

  function fieldWidthMm(focusDist) {
    const worldH =
      2 * focusDist * Math.tan(((camera.fov || 38) * Math.PI) / 180 / 2);
    const worldWUm = worldH * camera.aspect * UM_PER_UNIT;
    return worldWUm / 1000;
  }

  /** Rack-focus hunt: slide the focal plane, then lock. */
  function microscopeFocus(baseFocus, holdProgress, deep = false) {
    const u = THREE.MathUtils.clamp(holdProgress, 0, 1);
    if (deep) {
      // High-DOF: one clear near→far slide through the stack, then settle on subject
      if (u < 0.78) {
        const h = u / 0.78;
        const ease = h * h * (3 - 2 * h);
        const near = baseFocus * 0.48;
        const far = baseFocus * 1.42;
        return Math.max(0.12, THREE.MathUtils.lerp(near, far, ease));
      }
      const s = (u - 0.78) / 0.22;
      const ease = s * s * (3 - 2 * s);
      return Math.max(0.12, THREE.MathUtils.lerp(baseFocus * 1.18, baseFocus, ease));
    }
    // Pattern (~2 mm): gentler single sweep
    if (u >= 0.55) {
      const s = (u - 0.55) / 0.45;
      const ease = s * s * (3 - 2 * s);
      return THREE.MathUtils.lerp(baseFocus * 1.03, baseFocus, ease);
    }
    const h = u / 0.55;
    const amp = baseFocus * (0.2 * (1 - h * 0.45) + 0.05);
    const wave = Math.sin(h * Math.PI) * Math.exp(-h * 0.4);
    return Math.max(0.15, baseFocus + wave * amp);
  }

  function microscopeAperture(baseAperture, holdProgress, deep = false) {
    const u = THREE.MathUtils.clamp(holdProgress, 0, 1);
    if (deep) {
      // Keep aperture open while sliding so the rack is obvious
      if (u < 0.78) return baseAperture * 1.35;
      const s = (u - 0.78) / 0.22;
      return THREE.MathUtils.lerp(baseAperture * 1.35, baseAperture, s * s * (3 - 2 * s));
    }
    if (u >= 0.55) {
      const s = (u - 0.55) / 0.45;
      return THREE.MathUtils.lerp(baseAperture * 1.2, baseAperture, s * s * (3 - 2 * s));
    }
    return baseAperture * THREE.MathUtils.lerp(1.4, 1.12, u / 0.55);
  }

  const heroHost =
    canvas.closest(".hero") ||
    document.getElementById("app") ||
    document.querySelector(".hero");
  const scaleEl = mountScaleBar(heroHost);
  const scaleBar = scaleEl?.querySelector(".hero-scalebar-bar");
  const scaleLabel = scaleEl?.querySelector(".hero-scalebar-label");
  const focusRackEl = mountFocusRack(heroHost);
  const focusMarker = focusRackEl?.querySelector(".hero-focusrack-marker");
  const focusTrack = focusRackEl?.querySelector(".hero-focusrack-track");

  let paused = false;
  let panMode = false;
  let blending = false;
  let userSpin = true;
  let dragging = false;
  let focusDragging = false;
  /** Manual focus rack 0→1 when paused (0 = nearer, 1 = farther). */
  let userFocusRack = 0.5;
  let lastX = 0;
  let lastY = 0;
  let resumeTimer = 0;
  // Smoothed DOF state — survives beat transitions without infinite-focus pops
  let dofFocus = 195;
  let dofAperture = 0.00012;
  let dofMaxblur = 0.006;
  const exploreTarget = new THREE.Vector3();
  const _panDelta = new THREE.Vector3();
  const _viewRight = new THREE.Vector3();
  const _viewUp = new THREE.Vector3();
  const _worldUp = new THREE.Vector3(0, 1, 0);
  const _look = new THREE.Vector3();
  const _camPos = new THREE.Vector3();
  const _offset = new THREE.Vector3();
  const rotPerFrame = ((2 * Math.PI) / 60 / 60) * 0.28;
  const BLEND_RATE = 2.4;
  const MIN_DIST = 1.2;
  const MAX_DIST = 320;
  // Dive: ease into inclusion (with CCW orbit-pan) → 6s slow CCW orbit → zoom out.
  // Driven in code so arrival/orbit never hitch on Theatre keyframes.
  const APPROACH_T0 = 5.4;
  const APPROACH_T1 = 11.6; // gentle ease-in (~6.2s)
  const ORBIT_WALL_S = 6; // real-time seconds for the CCW orbit (same arc, slower)
  const ORBIT_T1 = APPROACH_T1 + ORBIT_WALL_S / PLAY_RATE;
  const PULL_T1 = ORBIT_T1 + 6.9; // ease back to overview
  const SPIRAL_PATTERN = { x: 42, y: 14, z: 55 };
  const _spiralStartOff = new THREE.Vector3(
    SPIRAL_PATTERN.x - HABITAT.x,
    SPIRAL_PATTERN.y - HABITAT.y,
    SPIRAL_PATTERN.z - HABITAT.z
  );
  const SPIRAL_A0 = Math.atan2(_spiralStartOff.x, _spiralStartOff.z);
  const SPIRAL_R0 = Math.hypot(_spiralStartOff.x, _spiralStartOff.z);
  const SPIRAL_Y0 = _spiralStartOff.y;
  const R_CLOSE = 3.35; // back enough that the whole ~14 µm cube stays in frame
  const Y_CLOSE = 0.28;
  const FOV_CLOSE = 28;
  // CCW = increasing angle with (sin θ, cos θ) offset in Y-up
  const APPROACH_ARC = 0.7; // ~40° of orbit-pan while zooming in
  const ORBIT_ARC = 0.7; // ~40° over the full 6s (slow, readable)
  const SPIRAL_LOOK0 = new THREE.Vector3(22, 0.4, 0.2);
  const OVERVIEW_CAM = new THREE.Vector3(48, 30, 195);
  const OVERVIEW_LOOK = new THREE.Vector3(0, 0, 0);

  const DEEP_SEQ_START = APPROACH_T0;
  const DEEP_SEQ_END = ORBIT_T1;
  const DEEP_BLEND_OUT = PULL_T1;
  const _habCam = new THREE.Vector3();
  const _habLook = new THREE.Vector3();
  const _blendCam = new THREE.Vector3();
  const _blendLook = new THREE.Vector3();

  function trackSequenceDirection(seqPos) {
    if (seqPos >= _prevSeqPos) _seqGoingForward = true;
    else if (seqPos < _prevSeqPos) _seqGoingForward = false;
    _prevSeqPos = seqPos;
  }

  function habitatWorld(out = _look) {
    out.set(HABITAT.x, HABITAT.y, HABITAT.z);
    root.updateMatrixWorld(true);
    root.localToWorld(out);
    return out;
  }

  function easeOutCubic(t) {
    const u = 1 - Math.min(1, Math.max(0, t));
    return 1 - u * u * u;
  }

  function easeInCubic(t) {
    const x = THREE.MathUtils.clamp(t, 0, 1);
    return x * x * x;
  }

  function easeOutQuint(t) {
    const u = 1 - Math.min(1, Math.max(0, t));
    return 1 - u * u * u * u * u;
  }

  function easeInOutCubic(t) {
    const x = THREE.MathUtils.clamp(t, 0, 1);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function deepCloseness(seqPos) {
    if (seqPos <= APPROACH_T0) return 0;
    if (seqPos >= APPROACH_T1) return 1;
    return easeOutCubic((seqPos - APPROACH_T0) / (APPROACH_T1 - APPROACH_T0));
  }

  function isDeepBeat(seqPos) {
    return seqPos >= APPROACH_T0 && seqPos <= ORBIT_T1;
  }

  function isDiveCamera(seqPos) {
    return seqPos > APPROACH_T0 && seqPos <= PULL_T1;
  }

  /** Stage grade: in during approach/orbit, out during pull-back. */
  function deepBlend(seqPos) {
    if (seqPos >= APPROACH_T1 && seqPos <= ORBIT_T1) return 1;
    if (seqPos > APPROACH_T0 && seqPos < APPROACH_T1) {
      return easeOutCubic((seqPos - APPROACH_T0) / (APPROACH_T1 - APPROACH_T0));
    }
    if (seqPos > ORBIT_T1 && seqPos < PULL_T1) {
      const u = (seqPos - ORBIT_T1) / (PULL_T1 - ORBIT_T1);
      return 1 - easeInCubic(u);
    }
    return 0;
  }

  function setCamOnHabitatOrbit(angle, radius, yOff, outCam) {
    outCam.set(
      HABITAT.x + Math.sin(angle) * radius,
      HABITAT.y + yOff,
      HABITAT.z + Math.cos(angle) * radius
    );
  }

  /** Spread orbit motion across the full 6s; only brake gently at the end. */
  function orbitSpinProgress(u) {
    const x = THREE.MathUtils.clamp(u, 0, 1);
    const brakeAt = 0.72;
    if (x <= brakeAt) return (x / brakeAt) * 0.9;
    const t = (x - brakeAt) / (1 - brakeAt);
    return 0.9 + 0.1 * easeOutCubic(t);
  }

  /**
   * Approach → CCW orbit (full 6s, then ease to a stop) → pull out (slow start, then accelerate).
   */
  function diveLocalPose(seqPos, outCam, outLook) {
    const arriveAngle = SPIRAL_A0 + APPROACH_ARC;

    if (seqPos <= APPROACH_T1) {
      const u = THREE.MathUtils.clamp(
        (seqPos - APPROACH_T0) / (APPROACH_T1 - APPROACH_T0),
        0,
        1
      );
      const zoom = easeOutCubic(u); // decelerate into the inclusion
      const angle = SPIRAL_A0 + APPROACH_ARC * u; // steady CCW pan while zooming
      const radius = SPIRAL_R0 + (R_CLOSE - SPIRAL_R0) * zoom;
      const yOff = SPIRAL_Y0 + (Y_CLOSE - SPIRAL_Y0) * zoom;
      setCamOnHabitatOrbit(angle, radius, yOff, outCam);
      const lookT = Math.min(1, u / 0.28);
      const ls = lookT * lookT * (3 - 2 * lookT);
      outLook.set(
        THREE.MathUtils.lerp(SPIRAL_LOOK0.x, HABITAT.x, ls),
        THREE.MathUtils.lerp(SPIRAL_LOOK0.y, HABITAT.y, ls),
        THREE.MathUtils.lerp(SPIRAL_LOOK0.z, HABITAT.z, ls)
      );
      return { fov: THREE.MathUtils.lerp(32, FOV_CLOSE, zoom) };
    }

    if (seqPos <= ORBIT_T1) {
      const u = THREE.MathUtils.clamp(
        (seqPos - APPROACH_T1) / (ORBIT_T1 - APPROACH_T1),
        0,
        1
      );
      const spin = orbitSpinProgress(u);
      const angle = arriveAngle + ORBIT_ARC * spin;
      setCamOnHabitatOrbit(angle, R_CLOSE, Y_CLOSE, outCam);
      outLook.set(HABITAT.x, HABITAT.y, HABITAT.z);
      return { fov: FOV_CLOSE };
    }

    // Next move: ease-in pull — crawl away, then accelerate to overview
    const u = THREE.MathUtils.clamp(
      (seqPos - ORBIT_T1) / (PULL_T1 - ORBIT_T1),
      0,
      1
    );
    const pull = easeInCubic(u);
    const endAngle = arriveAngle + ORBIT_ARC;
    setCamOnHabitatOrbit(endAngle, R_CLOSE, Y_CLOSE, outCam);
    outCam.lerp(OVERVIEW_CAM, pull);
    outLook.set(HABITAT.x, HABITAT.y, HABITAT.z).lerp(OVERVIEW_LOOK, pull);
    return { fov: THREE.MathUtils.lerp(FOV_CLOSE, 38, pull) };
  }

  /** Theatre poses are authored in crystal-local space — always transform by root. */
  function theatrePoseWorld(outCam, outLook) {
    outCam.set(
      theatreCam.position.x,
      theatreCam.position.y,
      theatreCam.position.z
    );
    outLook.set(theatreCam.lookAt.x, theatreCam.lookAt.y, theatreCam.lookAt.z);
    root.updateMatrixWorld(true);
    root.localToWorld(outCam);
    root.localToWorld(outLook);
  }

  function storyLookAt(target = _look) {
    const seqPos = sheet.sequence.position;
    if (isDiveCamera(seqPos)) {
      diveLocalPose(seqPos, _habCam, target);
      root.updateMatrixWorld(true);
      root.localToWorld(target);
      return target;
    }
    theatrePoseWorld(_habCam, target);
    return target;
  }

  function applyStoryCamera() {
    const seqPos = sheet.sequence.position;
    trackSequenceDirection(seqPos);

    if (isDiveCamera(seqPos)) {
      const { fov } = diveLocalPose(seqPos, _camPos, _look);
      root.updateMatrixWorld(true);
      root.localToWorld(_camPos);
      root.localToWorld(_look);
      camera.position.copy(_camPos);
      camera.lookAt(_look);
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      return;
    }

    theatrePoseWorld(_camPos, _look);
    camera.position.copy(_camPos);
    camera.lookAt(_look);
    if (Math.abs(camera.fov - theatreCam.fov) > 0.01) {
      camera.fov = theatreCam.fov;
      camera.updateProjectionMatrix();
    }
  }

  function setPaused(next) {
    if (next === paused && !blending) return;
    paused = next;
    blending = false;
    focusDragging = false;
    setPauseButtonState(paused);
    if (paused) {
      sheet.sequence.pause();
      userSpin = false;
      clearTimeout(resumeTimer);
      storyLookAt(exploreTarget);
      const dist = Math.max(0.2, camera.position.distanceTo(exploreTarget));
      // Seed rack from current subject distance (Euclidean), not view-Z mix
      userFocusRack = 0.5;
      setFocusRackInteractive(true);
    } else {
      setPanMode(false);
      setFocusRackInteractive(false);
      blending = true;
    }
  }

  function setPanMode(next) {
    const on = !!next;
    if (on === panMode) {
      setPanButtonState(panMode);
      return;
    }
    if (on && !paused) setPaused(true);
    if (!paused && on) return; // pause rejected
    panMode = on && paused;
    setPanButtonState(panMode);
    canvas.classList.toggle("is-panning", panMode);
  }

  function focusNearFar(focusDist) {
    // Wider rack travel: near plane can sit well in front of the subject
    const near = Math.max(0.08, focusDist * 0.16);
    const far = Math.max(near + 0.6, focusDist * 2.8);
    return { near, far };
  }

  function focusSpan(focusDist) {
    const { near, far } = focusNearFar(focusDist);
    return far - near;
  }

  function rackFromFocus(focus, focusDist) {
    const { near, far } = focusNearFar(focusDist);
    if (focus <= focusDist) {
      return THREE.MathUtils.clamp(
        0.5 * ((focus - near) / Math.max(1e-4, focusDist - near)),
        0.02,
        0.5
      );
    }
    return THREE.MathUtils.clamp(
      0.5 + 0.5 * ((focus - focusDist) / Math.max(1e-4, far - focusDist)),
      0.5,
      0.98
    );
  }

  function focusFromRack(rack, focusDist) {
    const { near, far } = focusNearFar(focusDist);
    const t = THREE.MathUtils.clamp(rack, 0.02, 0.98);
    // Mid-rack = subject distance (sharp when aperture allows)
    if (t <= 0.5) {
      return THREE.MathUtils.lerp(near, focusDist, t / 0.5);
    }
    return THREE.MathUtils.lerp(focusDist, far, (t - 0.5) / 0.5);
  }

  /** Iris from field of view: zoomed out → stopped down; deep zoom → wide open. */
  function irisFromField(fieldMm) {
    // 0 at ~2 mm FOV (overview-ish), 1 at ~40 µm (inclusion)
    const open = 1 - THREE.MathUtils.smoothstep(fieldMm, 0.04, 2.0);
    return open * open;
  }

  function apertureFromIris(iris) {
    return {
      aperture: THREE.MathUtils.lerp(0.000035, 0.00095, iris),
      maxblur: THREE.MathUtils.lerp(0.0025, 0.032, iris),
    };
  }

  function setFocusRackInteractive(on) {
    if (!focusRackEl) return;
    focusRackEl.classList.toggle("is-interactive", on);
    focusRackEl.setAttribute("aria-hidden", on ? "false" : "true");
    if (on) {
      focusRackEl.setAttribute("role", "slider");
      focusRackEl.setAttribute("aria-label", "Focus");
      focusRackEl.setAttribute("aria-orientation", "vertical");
      focusRackEl.setAttribute("aria-valuemin", "0");
      focusRackEl.setAttribute("aria-valuemax", "100");
    } else {
      focusRackEl.removeAttribute("role");
      focusRackEl.removeAttribute("aria-label");
      focusRackEl.removeAttribute("aria-orientation");
      focusRackEl.removeAttribute("aria-valuemin");
      focusRackEl.removeAttribute("aria-valuemax");
      focusRackEl.removeAttribute("aria-valuenow");
    }
  }

  function setUserFocusFromClientY(clientY) {
    if (!focusTrack) return;
    const rect = focusTrack.getBoundingClientRect();
    if (rect.height < 1) return;
    userFocusRack = THREE.MathUtils.clamp(
      (clientY - rect.top) / rect.height,
      0.04,
      0.96
    );
    if (focusMarker) {
      focusMarker.style.setProperty("--rack", userFocusRack.toFixed(3));
    }
    if (focusRackEl) {
      focusRackEl.setAttribute(
        "aria-valuenow",
        String(Math.round(userFocusRack * 100))
      );
    }
  }

  heroHost?.addEventListener("hero:pause-toggle", () => {
    setPaused(!paused);
  });
  heroHost?.addEventListener("hero:pan-toggle", () => {
    setPanMode(!panMode);
  });
  setPauseButtonState(false);
  setPanButtonState(false);
  setFocusRackInteractive(false);

  function onFocusPointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    // Grabbing the rack pauses the story so the user owns focus
    if (!paused) setPaused(true);
    focusDragging = true;
    setFocusRackInteractive(true);
    setUserFocusFromClientY(e.clientY);
    focusTrack?.setPointerCapture?.(e.pointerId);
    focusRackEl?.classList.add("is-dragging");
  }
  function onFocusPointerMove(e) {
    if (!focusDragging) return;
    e.preventDefault();
    e.stopPropagation();
    setUserFocusFromClientY(e.clientY);
  }
  function onFocusPointerUp(e) {
    if (!focusDragging) return;
    e.stopPropagation();
    focusDragging = false;
    focusRackEl?.classList.remove("is-dragging");
    try {
      focusTrack?.releasePointerCapture?.(e.pointerId);
    } catch (_) {}
  }
  function onFocusWheel(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!paused) setPaused(true);
    setFocusRackInteractive(true);
    userFocusRack = THREE.MathUtils.clamp(
      userFocusRack + e.deltaY * 0.0012,
      0.04,
      0.96
    );
    if (focusMarker) {
      focusMarker.style.setProperty("--rack", userFocusRack.toFixed(3));
    }
    if (focusRackEl) {
      focusRackEl.setAttribute(
        "aria-valuenow",
        String(Math.round(userFocusRack * 100))
      );
    }
  }
  if (focusTrack) {
    focusTrack.addEventListener("pointerdown", onFocusPointerDown);
    focusTrack.addEventListener("pointermove", onFocusPointerMove);
    focusTrack.addEventListener("pointerup", onFocusPointerUp);
    focusTrack.addEventListener("pointercancel", onFocusPointerUp);
    focusRackEl?.addEventListener("wheel", onFocusWheel, { passive: false });
  }

  function orbitByPointer(dx, dy) {
    // Turntable: yaw around fixed world +Y, pitch around screen-right.
    // (Camera-view tumble + Euler auto-spin was fighting and felt like loose XYZ.)
    root.rotateOnWorldAxis(_worldUp, dx * 0.005);
    _viewRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    // Keep pitch axis horizontal so we don't accumulate roll
    _viewRight.addScaledVector(_worldUp, -_viewRight.dot(_worldUp));
    if (_viewRight.lengthSq() > 1e-8) {
      _viewRight.normalize();
      root.rotateOnWorldAxis(_viewRight, dy * 0.004);
    }
  }

  function spinRoot(angle) {
    root.rotateOnWorldAxis(_worldUp, angle);
  }

  function panByPointer(dx, dy) {
    const dist = camera.position.distanceTo(exploreTarget);
    const worldH =
      2 * Math.max(dist, 0.2) * Math.tan((camera.fov * Math.PI) / 180 / 2);
    const pxToWorld = worldH / Math.max(1, viewH);
    _viewRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    _viewUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    _panDelta
      .copy(_viewRight)
      .multiplyScalar(-dx * pxToWorld)
      .addScaledVector(_viewUp, dy * pxToWorld);
    camera.position.add(_panDelta);
    exploreTarget.add(_panDelta);
    camera.lookAt(exploreTarget);
  }

  function zoomByWheel(deltaY) {
    _look.copy(exploreTarget);
    _offset.copy(camera.position).sub(_look);
    const dist = _offset.length();
    if (dist < 1e-4) return;
    const factor = Math.exp(deltaY * 0.00115);
    const next = THREE.MathUtils.clamp(dist * factor, MIN_DIST, MAX_DIST);
    _offset.multiplyScalar(next / dist);
    camera.position.copy(_look).add(_offset);
    camera.lookAt(_look);
  }

  function onPointerDown(e) {
    e.preventDefault();
    dragging = true;
    userSpin = false;
    clearTimeout(resumeTimer);
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.classList.add("is-dragging");
    canvas.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (panMode && paused) panByPointer(dx, dy);
    else orbitByPointer(dx, dy);
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove("is-dragging");
    try {
      canvas.releasePointerCapture?.(e.pointerId);
    } catch (_) {}
    if (!paused) {
      resumeTimer = setTimeout(() => {
        userSpin = true;
      }, 2400);
    }
  }
  function onWheel(e) {
    if (!paused) return;
    e.preventDefault();
    zoomByWheel(e.deltaY);
  }
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("lostpointercapture", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  let viewW = 1;
  let viewH = 1;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    viewW = Math.max(1, Math.round(rect.width) || window.innerWidth);
    viewH =
      Math.max(1, Math.round(rect.height)) ||
      Math.min(Math.round(window.innerHeight * 0.6), 760);
    camera.aspect = viewW / viewH;
    camera.updateProjectionMatrix();
    renderer.setSize(viewW, viewH, false);
    composer.setSize(viewW, viewH);
    composer.setPixelRatio(DOF_PR);
  }
  resize();
  window.addEventListener("resize", resize);

  function updateScaleBar() {
    if (!scaleBar || !scaleLabel) return;
    if (paused) _look.copy(exploreTarget);
    else storyLookAt(_look);
    const dist = camera.position.distanceTo(_look);
    const worldH = 2 * dist * Math.tan((camera.fov * Math.PI) / 180 / 2);
    const worldW = worldH * camera.aspect;
    const worldWUm = worldW * UM_PER_UNIT;
    const targetUm = worldWUm * (110 / viewW);
    const barUm = niceScaleUm(targetUm);
    const barPx = Math.max(28, Math.min(220, (barUm / worldWUm) * viewW));
    scaleBar.style.width = `${barPx.toFixed(1)}px`;
    scaleLabel.textContent = formatScale(barUm);
  }

  function blendTowardStory(dt) {
    const alpha = 1 - Math.exp(-BLEND_RATE * dt);
    trackSequenceDirection(sheet.sequence.position);
    theatrePoseWorld(_camPos, _look);
    const targetFov = theatreCam.fov;
    camera.position.lerp(_camPos, alpha);
    camera.fov += (targetFov - camera.fov) * alpha;
    camera.updateProjectionMatrix();
    camera.lookAt(_look);

    const posErr = camera.position.distanceTo(_camPos);
    const fovErr = Math.abs(camera.fov - targetFov);
    if (posErr < 0.35 && fovErr < 0.35) {
      applyStoryCamera();
      blending = false;
      playStory();
      userSpin = true;
    }
  }

  function updateFocusRack(hunting, focusDist, targetFocus) {
    if (!focusRackEl || !focusMarker) return;
    focusRackEl.classList.toggle("is-active", hunting);
    if (paused || focusDragging) {
      focusMarker.style.setProperty("--rack", userFocusRack.toFixed(3));
      return;
    }
    // Map focus plane vs subject distance → marker travel (0 = near/top, 1 = far/bottom)
    const rack = rackFromFocus(targetFocus ?? focusDist, focusDist);
    focusMarker.style.setProperty("--rack", rack.toFixed(3));
  }

  const clock = new THREE.Clock();
  // Shared Brownian speed (world units / s) — same for every microbe
  const BROWNIAN_SPEED = 0.55;
  const BROWNIAN_KICK = 2.2;
  let bugCursor = 0;
  const _prevCam = new THREE.Vector3().copy(camera.position);
  let camSpeed = 0;

  function tickBugs(dt, focusDist, budget) {
    if (!bacteria.length) return;
    // Far away: only animate microbes near the zoom target
    const pool = focusDist > 28 && hotBacteria.length ? hotBacteria : bacteria;
    const slice =
      focusDist > 60
        ? Math.max(6, Math.ceil(pool.length / 3))
        : focusDist > 25
          ? Math.max(10, Math.ceil(pool.length / 2))
          : pool.length;
    const n = Math.min(budget ?? slice, pool.length);
    for (let nDone = 0; nDone < n; nDone++) {
      const pi = bugCursor % pool.length;
      bugCursor++;
      const b = pool[pi];
      b.vx += (Math.random() - 0.5) * BROWNIAN_KICK * dt;
      b.vy += (Math.random() - 0.5) * BROWNIAN_KICK * dt;
      b.vz += (Math.random() - 0.5) * BROWNIAN_KICK * dt;
      let speed = Math.hypot(b.vx, b.vy, b.vz);
      if (speed < 1e-6) {
        b.vx = Math.random() - 0.5;
        b.vy = Math.random() - 0.5;
        b.vz = Math.random() - 0.5;
        speed = Math.hypot(b.vx, b.vy, b.vz);
      }
      const scale = BROWNIAN_SPEED / speed;
      b.vx *= scale;
      b.vy *= scale;
      b.vz *= scale;

      const step = dt * (pool.length / n);
      b.x += b.vx * step;
      b.y += b.vy * step;
      b.z += b.vz * step;
      const m = b.r * 1.15;
      const cav = b.cav;
      const minX = cav.x - cav.sx / 2 + m;
      const maxX = cav.x + cav.sx / 2 - m;
      const minY = cav.y - cav.sy / 2 + m;
      const maxY = cav.y + cav.sy / 2 - m;
      const minZ = cav.z - cav.sz / 2 + m;
      const maxZ = cav.z + cav.sz / 2 - m;
      if (b.x < minX || b.x > maxX) {
        b.vx *= -1;
        b.x = THREE.MathUtils.clamp(b.x, minX, maxX);
      }
      if (b.y < minY || b.y > maxY) {
        b.vy *= -1;
        b.y = THREE.MathUtils.clamp(b.y, minY, maxY);
      }
      if (b.z < minZ || b.z > maxZ) {
        b.vz *= -1;
        b.z = THREE.MathUtils.clamp(b.z, minZ, maxZ);
      }
      speed = Math.hypot(b.vx, b.vy, b.vz) || 1;
      const s2 = BROWNIAN_SPEED / speed;
      b.vx *= s2;
      b.vy *= s2;
      b.vz *= s2;

      _dummy.position.set(b.x, b.y, b.z);
      _dummy.scale.setScalar(b.r);
      _dummy.updateMatrix();
      bugMesh.setMatrixAt(b.idx, _dummy.matrix);
    }
    bugMesh.instanceMatrix.needsUpdate = true;
  }

  function tick() {
    const dt = Math.min(0.05, clock.getDelta());

    // Safety: never leave DOF depth-pass hides stuck off after an error
    hostMesh.visible = true;
    hostEdges.visible = true;
    cavityMesh.visible = true;

    if (paused) {
      camera.lookAt(exploreTarget);
    } else if (blending) {
      blendTowardStory(dt);
    } else {
      applyStoryCamera();
      const seqPos = sheet.sequence.position;
      // No root spin during dive — camera handles the CCW orbit
      if (userSpin && !dragging && seqPos <= APPROACH_T0) {
        spinRoot(rotPerFrame);
      } else if (userSpin && !dragging && seqPos > ORBIT_T1) {
        const spinScale = THREE.MathUtils.lerp(0.15, 1, 1 - deepBlend(seqPos));
        spinRoot(rotPerFrame * spinScale);
      }
    }

    if (paused) _look.copy(exploreTarget);
    else storyLookAt(_look);
    const focusDist = camera.position.distanceTo(_look);
    // Bokeh uses view-space Z (planar focus), not Euclidean distance — match it
    _offset.copy(_look).sub(camera.position);
    camera.getWorldDirection(_viewUp);
    const focusViewZ = -_offset.dot(_viewUp); // positive distance along view axis
    camSpeed = camera.position.distanceTo(_prevCam) / Math.max(dt, 1e-4);
    _prevCam.copy(camera.position);

    const movingFast = camSpeed > 12 || blending;
    const fieldMm = fieldWidthMm(focusDist);
    // Mild DOF from ~1.5 mm FOV; strong only at deep inclusion scales
    const dofAmt = 1 - THREE.MathUtils.smoothstep(fieldMm, 0.04, 1.5);
    const iris = irisFromField(fieldMm);
    const seqPos = sheet.sequence.position;
    // Bridge stage grade across the dive (FOV + story blend), not a hard cut
    const insideFromField = 1 - THREE.MathUtils.smoothstep(fieldMm, 0.05, 2.6);
    const insideTarget = Math.min(
      1,
      Math.max(insideFromField, deepBlend(seqPos) * 0.9)
    );
    updateStageGrade(insideTarget, dt);
    // Manual rack always enables DOF so the slider has a visible effect
    const manualFocus = paused || focusDragging;
    // When zoomed out, keep DOF off unless the user is actively racking —
    // and even then iris stays small so mid-rack can look sharp
    const wantDof = dofAmt > 0.08 || (manualFocus && iris > 0.04);
    const hold = !paused && !focusDragging && fieldMm <= FIELD_MM_MAX
      ? activeFocusHold(seqPos)
      : null;
    bokehPass.enabled = wantDof;

    tickBugs(
      dt,
      focusDist,
      movingFast && !hold ? Math.ceil((focusDist > 28 ? hotBacteria.length : bacteria.length) / 4) : undefined
    );

    bugMat.emissiveIntensity = focusDist < 20 ? 0.95 : 0.65;

    let rackEucl = focusDist;
    let slidingFocus = false;
    if (bokehPass.enabled) {
      const irisBase = apertureFromIris(iris);
      let targetFocus = focusViewZ;
      let targetAperture = irisBase.aperture;
      let targetMaxblur = irisBase.maxblur;

      if (manualFocus) {
        const eucl = focusFromRack(userFocusRack, focusDist);
        rackEucl = eucl;
        targetFocus = eucl * (focusViewZ / Math.max(focusDist, 1e-4));
        // Near mid-rack: close iris a touch so the subject can actually snap sharp
        const mid = 1 - Math.min(1, Math.abs(userFocusRack - 0.5) / 0.5);
        const snap = mid * mid;
        targetAperture *= THREE.MathUtils.lerp(1.05, 0.55, snap);
        targetMaxblur *= THREE.MathUtils.lerp(1.05, 0.5, snap);
        // Zoomed-out floor: never mush the whole frame
        if (iris < 0.2) {
          targetAperture = Math.min(targetAperture, 0.0001);
          targetMaxblur = Math.min(targetMaxblur, 0.008);
        }
      } else if (isDiveCamera(seqPos)) {
        // Lock focus plane to the look target; open iris only as we settle
        targetFocus = focusViewZ;
        rackEucl = focusDist;
        slidingFocus = false;
        const settle =
          seqPos <= APPROACH_T1
            ? deepCloseness(seqPos) ** 2 // stay stopped-down while diving in
            : 1;
        targetAperture = THREE.MathUtils.lerp(
          0.000035,
          irisBase.aperture * 0.8,
          settle
        );
        targetMaxblur = THREE.MathUtils.lerp(
          0.0025,
          irisBase.maxblur * 0.75,
          settle
        );
      } else if (hold) {
        const progress = microscopeHoldProgress(seqPos, hold);
        const eucl = microscopeFocus(focusDist, progress, false);
        rackEucl = eucl;
        targetFocus = eucl * (focusViewZ / Math.max(focusDist, 1e-4));
        targetAperture = microscopeAperture(targetAperture, progress, false);
        slidingFocus = progress < 0.55;
      } else if (movingFast) {
        targetMaxblur *= 0.8;
      }

      // Dive-in: focus snaps to the subject; iris can trail a little
      const divingIn = isDiveCamera(seqPos) && seqPos <= APPROACH_T1;
      const focusRate = focusDragging
        ? 40
        : divingIn
          ? 70
          : isDiveCamera(seqPos)
            ? 45
            : slidingFocus
              ? 28
              : movingFast
                ? 18
                : 22;
      const ease = 1 - Math.exp(-focusRate * dt);
      dofFocus += (targetFocus - dofFocus) * ease;
      if (divingIn) {
        // Hard catch-up so lag can’t accumulate as distance collapses
        dofFocus = THREE.MathUtils.lerp(dofFocus, targetFocus, 0.65);
      }
      const irisEase = 1 - Math.exp(-(focusDragging ? 28 : divingIn ? 8 : movingFast ? 12 : 14) * dt);
      dofAperture += (targetAperture - dofAperture) * irisEase;
      dofMaxblur += (targetMaxblur - dofMaxblur) * irisEase;

      bokehPass.uniforms.focus.value = dofFocus;
      bokehPass.uniforms.aperture.value = dofAperture;
      bokehPass.uniforms.maxblur.value = dofMaxblur;
      bokehPass.uniforms.nearClip.value = camera.near;
      bokehPass.uniforms.farClip.value = camera.far;
      composer.render();
    } else {
      dofFocus = focusViewZ;
      dofAperture = 0;
      dofMaxblur = 0;
      bokehPass.uniforms.aperture.value = 0;
      bokehPass.uniforms.maxblur.value = 0;
      renderer.render(scene, camera);
    }

    updateScaleBar();
    updateFocusRack(
      !!hold ||
        slidingFocus ||
        manualFocus ||
        (wantDof && isDiveCamera(seqPos)),
      focusDist,
      rackEucl
    );
    requestAnimationFrame(tick);
  }
  tick();

  return {
    setVisible(visible) {
      canvas.style.opacity = visible ? "1" : "0";
      canvas.style.transition = "opacity 0.7s ease";
      canvas.style.pointerEvents = visible ? "auto" : "none";
    },
    setPaused,
    setPanMode,
    dispose() {
      window.removeEventListener("resize", resize);
      sheet.sequence.pause();
      renderer.dispose();
    },
  };
}
