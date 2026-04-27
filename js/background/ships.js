import { chance, pickDifferent, pickOne, randomBetween } from "./motion.js";

let _shipIdCounter = 0;

const HERO_ROUTE_PATTERNS = ["left-to-right", "right-to-left", "diag-up", "diag-down", "arc-top", "arc-bottom"];
const ENEMY_ROUTE_PATTERNS = [
  "left-to-right",
  "right-to-left",
  "diag-up-left",
  "diag-up-right",
  "diag-down-left",
  "diag-down-right",
  "center-swoop-left",
  "center-swoop-right"
];

function quadraticBezier(start, control, end, t, target) {
  const invT = 1 - t;

  target.set(
    invT * invT * start.x + 2 * invT * t * control.x + t * t * end.x,
    invT * invT * start.y + 2 * invT * t * control.y + t * t * end.y,
    invT * invT * start.z + 2 * invT * t * control.z + t * t * end.z
  );

  return target;
}

function quadraticTangent(start, control, end, t, target) {
  target.set(
    2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x),
    2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y),
    2 * (1 - t) * (control.z - start.z) + 2 * t * (end.z - control.z)
  );

  return target;
}

function createHeroRoute(previousPattern = "") {
  const z = randomBetween(-17.5, -10.8);
  const pattern = pickDifferent(HERO_ROUTE_PATTERNS, previousPattern);

  switch (pattern) {
    case "right-to-left": {
      const lane = pickOne([randomBetween(-7.1, -5.1), randomBetween(4.7, 6.4)]);

      return {
        key: pattern,
        start: { x: 34, y: lane, z },
        end: { x: -34, y: lane + randomBetween(-1.1, 1.1), z: z + randomBetween(-2.1, 1.1) },
        control: { x: randomBetween(-10, 8), y: lane + randomBetween(-1.2, 1.2), z: z + randomBetween(-0.8, 1) },
        duration: randomBetween(18, 27),
        scale: randomBetween(0.96, 1.18),
        roll: 0.03,
        zigZag: 0
      };
    }

    case "diag-up": {
      return {
        key: pattern,
        start: { x: -34, y: randomBetween(6.6, 8.6), z },
        end: { x: 34, y: randomBetween(2.4, 4.8), z: z + randomBetween(-2, 1.4) },
        control: { x: randomBetween(-4, 12), y: randomBetween(4.9, 7.2), z: z + randomBetween(-0.8, 1.2) },
        duration: randomBetween(19, 27),
        scale: randomBetween(0.94, 1.12),
        roll: 0.032,
        zigZag: 0
      };
    }

    case "diag-down": {
      return {
        key: pattern,
        start: { x: 34, y: randomBetween(-8.8, -6.2), z },
        end: { x: -34, y: randomBetween(-4.6, -2.4), z: z + randomBetween(-2.1, 1.2) },
        control: { x: randomBetween(-10, 6), y: randomBetween(-7.4, -4.6), z: z + randomBetween(-0.8, 1.2) },
        duration: randomBetween(19, 28),
        scale: randomBetween(0.94, 1.12),
        roll: 0.032,
        zigZag: 0
      };
    }

    case "arc-top": {
      return {
        key: pattern,
        start: { x: -34, y: randomBetween(7.6, 9.1), z },
        end: { x: 34, y: randomBetween(6.2, 8.1), z: z + randomBetween(-2, 1) },
        control: { x: randomBetween(-1.5, 8), y: randomBetween(9.6, 11.4), z: z + randomBetween(-1.2, 1.1) },
        duration: randomBetween(20, 29),
        scale: randomBetween(0.94, 1.14),
        roll: 0.028,
        zigZag: 0
      };
    }

    case "arc-bottom": {
      return {
        key: pattern,
        start: { x: 34, y: randomBetween(-9.4, -7.6), z },
        end: { x: -34, y: randomBetween(-8.1, -6.1), z: z + randomBetween(-2, 1) },
        control: { x: randomBetween(-8, 1.5), y: randomBetween(-11.8, -9.8), z: z + randomBetween(-1.2, 1.1) },
        duration: randomBetween(20, 29),
        scale: randomBetween(0.94, 1.14),
        roll: 0.028,
        zigZag: 0
      };
    }

    default: {
      const lane = pickOne([randomBetween(-6.8, -5.2), randomBetween(4.7, 6.5)]);

      return {
        key: pattern,
        start: { x: -34, y: lane, z },
        end: { x: 34, y: lane + randomBetween(-1, 1), z: z + randomBetween(-2, 1.2) },
        control: { x: randomBetween(-6, 10), y: lane + randomBetween(-1.1, 1.1), z: z + randomBetween(-0.8, 1.1) },
        duration: randomBetween(18, 27),
        scale: randomBetween(0.96, 1.18),
        roll: 0.03,
        zigZag: 0
      };
    }
  }
}

function createEnemyRoute(previousPattern = "") {
  const z = randomBetween(-25.5, -15.4);
  const pattern = pickDifferent(ENEMY_ROUTE_PATTERNS, previousPattern);

  switch (pattern) {
    case "right-to-left": {
      const lane = pickOne([
        randomBetween(-9.4, -6.3),
        randomBetween(-4.8, -2.2),
        randomBetween(2.2, 4.8),
        randomBetween(6.2, 9.3)
      ]);

      return {
        key: pattern,
        start: { x: 38, y: lane, z },
        end: { x: -38, y: lane + randomBetween(-2.2, 2.2), z: z + randomBetween(-2.4, 2) },
        control: { x: randomBetween(-14, 10), y: lane + randomBetween(-3.2, 3.2), z: z + randomBetween(-1.4, 1.4) },
        duration: randomBetween(10.5, 17.5),
        scale: randomBetween(0.7, 0.96),
        roll: 0.048,
        zigZag: randomBetween(0.12, 0.34)
      };
    }

    case "diag-up-left": {
      return {
        key: pattern,
        start: { x: 36, y: randomBetween(6.4, 9.6), z },
        end: { x: -34, y: randomBetween(-5.8, -2.2), z: z + randomBetween(-2, 2.1) },
        control: { x: randomBetween(-12, 8), y: randomBetween(-2.2, 1.8), z: z + randomBetween(-1.8, 1.6) },
        duration: randomBetween(10, 16.5),
        scale: randomBetween(0.68, 0.94),
        roll: 0.052,
        zigZag: randomBetween(0.14, 0.42)
      };
    }

    case "diag-up-right": {
      return {
        key: pattern,
        start: { x: -36, y: randomBetween(6.4, 9.6), z },
        end: { x: 34, y: randomBetween(-5.8, -2.2), z: z + randomBetween(-2, 2.1) },
        control: { x: randomBetween(-8, 12), y: randomBetween(-2.2, 1.8), z: z + randomBetween(-1.8, 1.6) },
        duration: randomBetween(10, 16.5),
        scale: randomBetween(0.68, 0.94),
        roll: 0.052,
        zigZag: randomBetween(0.14, 0.42)
      };
    }

    case "diag-down-left": {
      return {
        key: pattern,
        start: { x: 36, y: randomBetween(-9.8, -6.4), z },
        end: { x: -34, y: randomBetween(2.2, 5.4), z: z + randomBetween(-2, 2.1) },
        control: { x: randomBetween(-12, 8), y: randomBetween(-1.4, 2.8), z: z + randomBetween(-1.8, 1.6) },
        duration: randomBetween(10, 16.5),
        scale: randomBetween(0.68, 0.94),
        roll: 0.052,
        zigZag: randomBetween(0.14, 0.42)
      };
    }

    case "diag-down-right": {
      return {
        key: pattern,
        start: { x: -36, y: randomBetween(-9.8, -6.4), z },
        end: { x: 34, y: randomBetween(2.2, 5.4), z: z + randomBetween(-2, 2.1) },
        control: { x: randomBetween(-8, 12), y: randomBetween(-1.4, 2.8), z: z + randomBetween(-1.8, 1.6) },
        duration: randomBetween(10, 16.5),
        scale: randomBetween(0.68, 0.94),
        roll: 0.052,
        zigZag: randomBetween(0.14, 0.42)
      };
    }

    case "center-swoop-left": {
      return {
        key: pattern,
        start: { x: 36, y: randomBetween(5.2, 8.8), z },
        end: { x: -36, y: randomBetween(-5.8, -2.8), z: z + randomBetween(-2.4, 2.1) },
        control: { x: randomBetween(-2, 7), y: randomBetween(-0.4, 1.8), z: z + randomBetween(-1.8, 1.8) },
        duration: randomBetween(9.2, 15.2),
        scale: randomBetween(0.68, 0.94),
        roll: 0.056,
        zigZag: randomBetween(0.18, 0.48)
      };
    }

    case "center-swoop-right": {
      return {
        key: pattern,
        start: { x: -36, y: randomBetween(-8.8, -5.2), z },
        end: { x: 36, y: randomBetween(2.8, 5.8), z: z + randomBetween(-2.4, 2.1) },
        control: { x: randomBetween(-7, 2), y: randomBetween(-1.8, 0.4), z: z + randomBetween(-1.8, 1.8) },
        duration: randomBetween(9.2, 15.2),
        scale: randomBetween(0.68, 0.94),
        roll: 0.056,
        zigZag: randomBetween(0.18, 0.48)
      };
    }

    default: {
      const lane = pickOne([
        randomBetween(-9.4, -6.3),
        randomBetween(-4.8, -2.2),
        randomBetween(2.2, 4.8),
        randomBetween(6.2, 9.3)
      ]);

      return {
        key: pattern,
        start: { x: -38, y: lane, z },
        end: { x: 38, y: lane + randomBetween(-2.2, 2.2), z: z + randomBetween(-2.4, 2) },
        control: { x: randomBetween(-10, 14), y: lane + randomBetween(-3.2, 3.2), z: z + randomBetween(-1.4, 1.4) },
        duration: randomBetween(10.5, 17.5),
        scale: randomBetween(0.7, 0.96),
        roll: 0.048,
        zigZag: randomBetween(0.12, 0.34)
      };
    }
  }
}

function buildShip(THREE, textures, shared) {
  const root = new THREE.Group();

  // ── Fuselage ──
  const hull = new THREE.Mesh(shared.fuselageGeo, shared.hullMaterial.clone());
  hull.rotation.z = -Math.PI * 0.5;

  // ── Nose ──
  const nose = new THREE.Mesh(shared.noseGeo, shared.hullMaterial.clone());
  nose.rotation.z = -Math.PI * 0.5;
  nose.position.x = 0.74;

  // ── Wings (pair, spread in z) ──
  const wingA = new THREE.Mesh(shared.wingGeo, shared.wingMaterial.clone());
  wingA.position.set(-0.06, 0, 0.34);
  wingA.rotation.x = -0.24;

  const wingB = new THREE.Mesh(shared.wingGeo, shared.wingMaterial.clone());
  wingB.position.set(-0.06, 0, -0.34);
  wingB.rotation.x = 0.24;

  // ── Engine nacelles ──
  const nacL = new THREE.Mesh(shared.nacelleGeo, shared.nacelleMaterial.clone());
  nacL.rotation.z = -Math.PI * 0.5;
  nacL.position.set(-0.3, 0, 0.27);

  const nacR = new THREE.Mesh(shared.nacelleGeo, shared.nacelleMaterial.clone());
  nacR.rotation.z = -Math.PI * 0.5;
  nacR.position.set(-0.3, 0, -0.27);

  // ── Engine bells ──
  const bellL = new THREE.Mesh(shared.bellGeo, shared.bellMaterial.clone());
  bellL.rotation.z = -Math.PI * 0.5;
  bellL.position.set(-0.62, 0, 0.27);

  const bellR = new THREE.Mesh(shared.bellGeo, shared.bellMaterial.clone());
  bellR.rotation.z = -Math.PI * 0.5;
  bellR.position.set(-0.62, 0, -0.27);

  // ── Trail & engine glow ──
  const trailMaterial = new THREE.MeshBasicMaterial({
    map: textures.shipTrail,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0
  });
  const trail = new THREE.Mesh(shared.trailGeometry, trailMaterial);
  trail.position.x = -0.92;

  const engineMaterial = new THREE.SpriteMaterial({
    map: textures.glow,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0
  });
  const engine = new THREE.Sprite(engineMaterial);
  engine.position.set(-0.68, 0, 0);

  root.visible = false;
  root.add(trail, engine, hull, nose, wingA, wingB, nacL, nacR, bellL, bellR);

  return {
    root, trail, engine,
    hull, nose, wingA, wingB, nacL, nacR, bellL, bellR,
    materials: [
      hull.material, nose.material,
      wingA.material, wingB.material,
      nacL.material, nacR.material,
      bellL.material, bellR.material,
      trailMaterial, engineMaterial
    ],
    state: {
      active: false,
      kind: "enemy",
      id: _shipIdCounter++,
      progress: 0,
      duration: 1,
      scale: 1,
      start: new THREE.Vector3(),
      control: new THREE.Vector3(),
      end: new THREE.Vector3(),
      position: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      rollPhase: randomBetween(0, Math.PI * 2),
      zigZag: 0,
      zigZagPhase: randomBetween(0, Math.PI * 2),
      rollAmount: 0.04,
      attackCooldown: randomBetween(1.8, 4.2),
      hoverAmplitude: randomBetween(0.016, 0.052),
      hoverSpeed: randomBetween(0.12, 0.28),
      bankBias: randomBetween(-0.018, 0.018),
      enginePulsePhase: randomBetween(0, Math.PI * 2),
      attackFlash: 0,
      evasionStrength: 0,
      evasionPhase: randomBetween(0, Math.PI * 2),
      lateralWaveAmplitude: randomBetween(0.04, 0.2),
      lateralWaveFrequency: randomBetween(1.2, 2.6),
      lateralWavePhase: randomBetween(0, Math.PI * 2),
      depthWaveAmplitude: randomBetween(0.06, 0.24),
      depthWaveFrequency: randomBetween(0.6, 1.4),
      depthWavePhase: randomBetween(0, Math.PI * 2)
    }
  };
}

function applyShipProfile(ship, profile, trailsEnabled) {
  const hero = profile.kind === "hero";
  ship.hull.material.color.set(profile.tint);
  ship.nose.material.color.set(profile.tint);
  ship.wingA.material.color.set(profile.wingTint);
  ship.wingB.material.color.set(profile.wingTint);
  ship.nacL.material.color.set(profile.bodyTint);
  ship.nacR.material.color.set(profile.bodyTint);
  ship.trail.material.color.set(profile.trailTint);
  ship.engine.material.color.set(profile.trailTint);

  const sc = hero ? 1.18 : 1;
  ship.root.scale.setScalar(sc);
  ship.trail.scale.set(
    hero ? 1.3 : 1.08,
    trailsEnabled ? (hero ? 0.28 : 0.22) : 0.001,
    1
  );
  ship.engine.scale.set(hero ? 0.56 : 0.44, hero ? 0.56 : 0.44, 1);
}

function buildStreak(THREE, textures, geometry, tint) {
  const material = new THREE.MeshBasicMaterial({
    map: textures.attack,
    color: new THREE.Color(tint),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false;

  return {
    mesh,
    material,
    state: {
      active: false,
      elapsed: 0,
      life: 0,
      baseOpacity: 0,
      velocity: new THREE.Vector3(),
      position: new THREE.Vector3()
    }
  };
}

export function createShips({ THREE, quality, textures }) {
  const group = new THREE.Group();
  const shipGroup = new THREE.Group();
  const streakGroup = new THREE.Group();
  const ships = [];
  const streaks = [];
  const tempPosition = new THREE.Vector3();
  const tempTangent = new THREE.Vector3();
  const tempDirection = new THREE.Vector3();
  const tempSide = new THREE.Vector3();
  const tempTargetDirection = new THREE.Vector3();
  const tempShotOrigin = new THREE.Vector3();
  const tempShotSide = new THREE.Vector3();
  const tempBlackHoleDirection = new THREE.Vector3();
  const heroProfiles = [
    { kind: "hero", tint: "#eef8ff", bodyTint: "#d9f3ff", wingTint: "#bddfff", trailTint: "#7de9ff" },
    { kind: "hero", tint: "#f4fbff", bodyTint: "#dff8ff", wingTint: "#cce6ff", trailTint: "#9fe9ff" }
  ];
  const enemyProfiles = [
    { kind: "enemy", tint: "#ffcaa7", bodyTint: "#ffb489", wingTint: "#ffd79f", trailTint: "#ff9368" },
    { kind: "enemy", tint: "#ffd8b5", bodyTint: "#ffc28f", wingTint: "#ffe1b5", trailTint: "#ffd975" },
    { kind: "enemy", tint: "#ffbea4", bodyTint: "#ff9f70", wingTint: "#ffd2aa", trailTint: "#ff8d65" }
  ];
  const shared = {
    fuselageGeo:     new THREE.CylinderGeometry(0.09, 0.18, 1.02, 9, 1),
    noseGeo:         new THREE.ConeGeometry(0.09, 0.42, 9),
    wingGeo:         new THREE.BoxGeometry(0.52, 0.026, 0.48),
    nacelleGeo:      new THREE.CylinderGeometry(0.046, 0.064, 0.54, 7),
    bellGeo:         new THREE.CylinderGeometry(0.074, 0.052, 0.11, 8),
    trailGeometry:   new THREE.PlaneGeometry(2, 0.2),
    streakGeometry:  new THREE.PlaneGeometry(4.2, 0.12),
    hullMaterial:    new THREE.MeshStandardMaterial({ metalness: 0.72, roughness: 0.24 }),
    wingMaterial:    new THREE.MeshStandardMaterial({ metalness: 0.68, roughness: 0.28 }),
    nacelleMaterial: new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.82, roughness: 0.18 }),
    bellMaterial:    new THREE.MeshStandardMaterial({ color: 0x1a2230, metalness: 0.9, roughness: 0.1 })
  };
  const trailsEnabled = Boolean(quality.enableTrails);

  // Pre-allocated scratch buffers — avoids per-frame heap allocation in getActivePositions / getActiveStreaks
  const _posObjects  = Array.from({ length: quality.shipPoolSize },   () => ({ id: 0, x: 0, y: 0, z: 0, kind: "" }));
  const _posResult   = [];
  const _strkObjects = Array.from({ length: quality.streakPoolSize }, () => ({ x: 0, y: 0, z: 0 }));
  const _strkResult  = [];

  let activeHeroes = 0;
  let activeEnemies = 0;
  let activeTotal = 0;
  let activeStreaks = 0;
  let attackTimer = randomBetween(quality.attackInterval.min * 0.7, quality.attackInterval.max * 0.92);
  let lastHeroRoute = "";
  let lastEnemyRoute = "";

  for (let index = 0; index < quality.shipPoolSize; index += 1) {
    const ship = buildShip(THREE, textures, shared);
    ships.push(ship);
    shipGroup.add(ship.root);
  }

  for (let index = 0; index < quality.streakPoolSize; index += 1) {
    const streak = buildStreak(THREE, textures, shared.streakGeometry, index % 2 === 0 ? "#ff9f70" : "#7de9ff");
    streaks.push(streak);
    streakGroup.add(streak.mesh);
  }

  group.add(shipGroup, streakGroup);

  function getActiveCounts() {
    return {
      heroes: activeHeroes,
      enemies: activeEnemies,
      total: activeTotal
    };
  }

  function acquireInactiveShip() {
    for (let index = 0; index < ships.length; index += 1) {
      if (!ships[index].state.active) {
        return ships[index];
      }
    }

    return null;
  }

  function applyRoute(ship, route, kind, profile) {
    ship.state.active = true;
    ship.state.kind = kind;
    ship.state.progress = 0;
    ship.state.duration = route.duration;
    ship.state.scale = route.scale;
    ship.state.rollPhase = randomBetween(0, Math.PI * 2);
    ship.state.zigZag = route.zigZag;
    ship.state.zigZagPhase = randomBetween(0, Math.PI * 2);
    ship.state.rollAmount = route.roll;
    ship.state.attackCooldown = kind === "hero"
      ? randomBetween(2.6, 5.4)
      : randomBetween(1.6, 3.6);
    ship.state.hoverAmplitude = kind === "hero"
      ? randomBetween(0.016, 0.034)
      : randomBetween(0.024, 0.072);
    ship.state.hoverSpeed = kind === "hero"
      ? randomBetween(0.14, 0.24)
      : randomBetween(0.18, 0.36);
    ship.state.bankBias = randomBetween(-0.024, 0.024);
    ship.state.enginePulsePhase = randomBetween(0, Math.PI * 2);
    ship.state.lateralWaveAmplitude = randomBetween(kind === "hero" ? 0.04 : 0.08, kind === "hero" ? 0.14 : 0.24);
    ship.state.lateralWaveFrequency = randomBetween(kind === "hero" ? 1.1 : 1.4, kind === "hero" ? 2 : 2.8);
    ship.state.lateralWavePhase = randomBetween(0, Math.PI * 2);
    ship.state.depthWaveAmplitude = randomBetween(kind === "hero" ? 0.05 : 0.08, kind === "hero" ? 0.16 : 0.28);
    ship.state.depthWaveFrequency = randomBetween(0.52, 1.2);
    ship.state.depthWavePhase = randomBetween(0, Math.PI * 2);
    ship.state.start.set(route.start.x, route.start.y, route.start.z);
    ship.state.control.set(route.control.x, route.control.y, route.control.z);
    ship.state.end.set(route.end.x, route.end.y, route.end.z);
    applyShipProfile(ship, profile, trailsEnabled);
    ship.root.visible = true;

    if (kind === "hero") {
      activeHeroes += 1;
    } else {
      activeEnemies += 1;
    }

    activeTotal += 1;
  }

  function resetShip(ship) {
    if (!ship.state.active) {
      return;
    }

    if (ship.state.kind === "hero") {
      activeHeroes = Math.max(0, activeHeroes - 1);
    } else {
      activeEnemies = Math.max(0, activeEnemies - 1);
    }

    activeTotal = Math.max(0, activeTotal - 1);
    ship.state.active = false;
    ship.root.visible = false;
    ship.trail.material.opacity = 0;
    ship.engine.material.opacity = 0;
  }

  function spawnHero() {
    if (activeTotal >= quality.shipPoolSize || activeHeroes >= quality.maxActiveHeroes) {
      return false;
    }

    const ship = acquireInactiveShip();

    if (!ship) {
      return false;
    }

    const route = createHeroRoute(lastHeroRoute);
    lastHeroRoute = route.key;
    applyRoute(ship, route, "hero", pickOne(heroProfiles));
    return true;
  }

  function spawnEnemy() {
    if (activeTotal >= quality.shipPoolSize || activeEnemies >= quality.maxActiveEnemies) {
      return false;
    }

    const ship = acquireInactiveShip();

    if (!ship) {
      return false;
    }

    const route = createEnemyRoute(lastEnemyRoute);
    lastEnemyRoute = route.key;
    applyRoute(ship, route, "enemy", pickOne(enemyProfiles));
    return true;
  }

  function acquireInactiveStreak() {
    for (let index = 0; index < streaks.length; index += 1) {
      if (!streaks[index].state.active) {
        return streaks[index];
      }
    }

    return null;
  }

  function pickActiveShip(kind, exclude = null) {
    let selected = null;
    let seen = 0;

    for (let index = 0; index < ships.length; index += 1) {
      const ship = ships[index];

      if (!ship.state.active || ship === exclude || (kind && ship.state.kind !== kind)) {
        continue;
      }

      seen += 1;

      if (Math.random() < 1 / seen) {
        selected = ship;
      }
    }

    return selected;
  }

  function findEncounterPair() {
    let bestHero = null;
    let bestEnemy = null;
    let bestScore = Infinity;

    for (let index = 0; index < ships.length; index += 1) {
      const ship = ships[index];

      if (!ship.state.active || ship.state.kind !== "hero" || ship.state.attackCooldown > 0) {
        continue;
      }

      for (let otherIndex = 0; otherIndex < ships.length; otherIndex += 1) {
        const other = ships[otherIndex];

        if (!other.state.active || other.state.kind !== "enemy" || other.state.attackCooldown > 0) {
          continue;
        }

        const dx = ship.state.position.x - other.state.position.x;
        const dy = ship.state.position.y - other.state.position.y;
        const dz = ship.state.position.z - other.state.position.z;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const absDz = Math.abs(dz);

        if (absDx > 18 || absDy > 5.8 || absDz > 9.4) {
          continue;
        }

        const score = absDx + absDy * 2.6 + absDz * 3.4;

        if (score < bestScore) {
          bestScore = score;
          bestHero = ship;
          bestEnemy = other;
        }
      }
    }

    return bestHero && bestEnemy ? { hero: bestHero, enemy: bestEnemy } : null;
  }

  function activateStreak(streak, source, target = null, sourceVelocity = null) {
    if (!streak || !source) {
      return false;
    }

    const velocity = target
      ? tempTargetDirection.copy(target.state.position).sub(source.state.position).normalize()
      : tempTargetDirection.copy(sourceVelocity || source.state.tangent).normalize();
    const flashTint = source.state.kind === "hero" ? "#8fe8ff" : "#ff9e72";
    const offsetMagnitude = target ? randomBetween(-0.1, 0.1) : randomBetween(-0.14, 0.14);

    tempShotSide.set(-velocity.y, velocity.x, 0).normalize().multiplyScalar(offsetMagnitude);
    tempShotOrigin.copy(source.state.position).addScaledVector(velocity, 0.58).add(tempShotSide);

    streak.state.active = true;
    activeStreaks += 1;
    streak.state.elapsed = 0;
    streak.state.life = target ? randomBetween(0.28, 0.52) : randomBetween(0.24, 0.42);
    streak.state.baseOpacity = (source.state.kind === "hero" ? 0.18 : 0.22) * quality.glowStrength;
    streak.state.position.copy(tempShotOrigin);
    streak.state.position.z += source.state.kind === "hero" ? 0.08 : 0.12;
    streak.state.velocity.copy(velocity.multiplyScalar(randomBetween(12, 19) * quality.motionScale));
    streak.mesh.position.copy(streak.state.position);
    streak.mesh.rotation.z = Math.atan2(streak.state.velocity.y, streak.state.velocity.x);
    streak.mesh.visible = true;
    streak.material.color.set(flashTint);
    streak.material.opacity = streak.state.baseOpacity;
    streak.mesh.scale.x = target ? randomBetween(0.78, 0.96) : randomBetween(0.64, 0.84);
    streak.mesh.scale.y = randomBetween(0.72, 1.04);
    source.state.attackCooldown = source.state.kind === "hero"
      ? randomBetween(5.4, 8.2)
      : randomBetween(3.6, 6.2);
    source.state.attackFlash = 1;

    if (target) {
      target.state.evasionStrength = Math.max(target.state.evasionStrength, randomBetween(0.16, 0.34));
    }

    return true;
  }

  function triggerAttack() {
    const encounter = findEncounterPair();
    const source = encounter
      ? (chance(0.72) ? encounter.enemy : encounter.hero)
      : (chance(0.3) ? (chance(0.76) ? pickActiveShip("enemy") : pickActiveShip("hero")) : null);

    if (!source) {
      return;
    }

    const target = encounter
      ? (source.state.kind === "enemy" ? encounter.hero : encounter.enemy)
      : pickActiveShip(source.state.kind === "enemy" ? "hero" : "enemy", source);
    const streak = acquireInactiveStreak();

    if (!activateStreak(streak, source, target)) {
      return;
    }

    if (
      encounter &&
      quality.streakPoolSize > 1 &&
      target &&
      target.state.attackCooldown <= 0 &&
      chance(0.12)
    ) {
      const counterStreak = acquireInactiveStreak();
      activateStreak(counterStreak, target, source);
    }
  }

  function update(frame) {
    const warpStrength = frame.warp?.strength || 0;
    const blackHole = frame.blackHole;
    const lightingStrength = frame.lightingPulse?.strength || 0;

    group.position.x = (frame.camera?.driftX || 0) * 0.14;
    group.position.y = (frame.camera?.driftY || 0) * 0.08;

    for (let index = 0; index < ships.length; index += 1) {
      const ship = ships[index];

      if (!ship.state.active) {
        continue;
      }

      ship.state.attackCooldown = Math.max(0, ship.state.attackCooldown - frame.delta);
      ship.state.attackFlash = Math.max(0, ship.state.attackFlash - frame.delta * 3.2);
      ship.state.evasionStrength = Math.max(0, ship.state.evasionStrength - frame.delta * 0.6);
      ship.state.progress += frame.delta / ship.state.duration;

      if (ship.state.progress >= 1) {
        resetShip(ship);
        continue;
      }

      quadraticBezier(ship.state.start, ship.state.control, ship.state.end, ship.state.progress, tempPosition);
      quadraticTangent(ship.state.start, ship.state.control, ship.state.end, ship.state.progress, tempTangent);
      tempDirection.copy(tempTangent).normalize();
      tempSide.set(-tempDirection.y, tempDirection.x, 0);

      if (ship.state.kind === "enemy" && ship.state.zigZag > 0) {
        tempPosition.y += Math.sin(frame.elapsed * 1.8 + ship.state.zigZagPhase) * ship.state.zigZag;
      }

      tempPosition.addScaledVector(
        tempSide,
        Math.sin(frame.elapsed * ship.state.lateralWaveFrequency + ship.state.lateralWavePhase) * ship.state.lateralWaveAmplitude
      );
      tempPosition.z +=
        Math.cos(frame.elapsed * ship.state.depthWaveFrequency + ship.state.depthWavePhase) *
        ship.state.depthWaveAmplitude;

      if (ship.state.evasionStrength > 0) {
        tempPosition.y +=
          Math.sin(frame.elapsed * (2.2 + ship.state.hoverSpeed) + ship.state.evasionPhase) *
          ship.state.evasionStrength;
        tempPosition.z +=
          Math.cos(frame.elapsed * 2.8 + ship.state.evasionPhase) *
          ship.state.evasionStrength *
          0.18;
      }

      if (blackHole?.strength > 0.01) {
        const radius = blackHole.influenceRadius * (ship.state.kind === "hero" ? 0.76 : 0.96);

        tempBlackHoleDirection.set(
          blackHole.position.x - tempPosition.x,
          blackHole.position.y - tempPosition.y,
          0
        );

        const distanceSq =
          tempBlackHoleDirection.x * tempBlackHoleDirection.x +
          tempBlackHoleDirection.y * tempBlackHoleDirection.y;

        if (distanceSq < radius * radius) {
          const distance = Math.sqrt(distanceSq) + 0.0001;
          const falloff = 1 - distance / radius;
          const pull = falloff * falloff * blackHole.pull * (ship.state.kind === "hero" ? 0.22 : 0.34);

          tempPosition.addScaledVector(tempBlackHoleDirection.multiplyScalar(1 / distance), pull);
        }
      }

      ship.state.position.copy(tempPosition);
      ship.state.tangent.copy(tempTangent);
      ship.root.position.copy(tempPosition);
      ship.root.rotation.z = Math.atan2(tempTangent.y, tempTangent.x);

      const fade = ship.state.progress < 0.14
        ? ship.state.progress / 0.14
        : ship.state.progress > 0.84
          ? (1 - ship.state.progress) / 0.16
          : 1;
      const hero = ship.state.kind === "hero";
      const cinematicScale =
        1 +
        lightingStrength * (hero ? 0.03 : 0.02) -
        warpStrength * 0.04 -
        (blackHole?.pull || 0) * 0.02;

      ship.root.scale.setScalar(ship.state.scale * cinematicScale);
      ship.root.position.z += Math.sin(frame.elapsed * ship.state.hoverSpeed + ship.state.rollPhase) * ship.state.hoverAmplitude;
      ship.root.rotation.x =
        Math.sin(frame.elapsed * (hero ? 0.54 : 0.8) + ship.state.rollPhase) * ship.state.rollAmount +
        ship.state.bankBias;
      ship.root.rotation.y =
        Math.cos(frame.elapsed * (hero ? 0.32 : 0.58) + ship.state.rollPhase) * ship.state.rollAmount;

      if (trailsEnabled) {
        ship.trail.material.opacity =
          (hero ? 0.074 : 0.046) *
          fade *
          quality.glowStrength *
          (0.88 + Math.sin(frame.elapsed * 0.82 + ship.state.enginePulsePhase) * 0.12 + ship.state.attackFlash * 0.18 + lightingStrength * 0.08) *
          (1 - warpStrength * 0.34);
        ship.trail.scale.x = 1.08 + Math.min(hero ? 1.9 : 1.58, tempTangent.length() * (hero ? 0.06 : 0.08));
      }

      ship.engine.material.opacity =
        (hero ? 0.28 : 0.18) *
        fade *
        quality.glowStrength *
        (0.84 + Math.sin(frame.elapsed * 1.02 + ship.state.enginePulsePhase) * 0.14 + ship.state.attackFlash * 0.26 + lightingStrength * 0.06) *
        (1 - warpStrength * 0.22);

      if (
        Math.abs(ship.root.position.x) > 42 ||
        Math.abs(ship.root.position.y) > 16
      ) {
        resetShip(ship);
      }
    }

    if (activeTotal > 0) {
      attackTimer -= frame.delta;

      if (attackTimer <= 0) {
        triggerAttack();
        attackTimer =
          randomBetween(quality.attackInterval.min, quality.attackInterval.max) *
          (chance(0.14) ? randomBetween(0.72, 0.92) : randomBetween(0.98, 1.24));
      }
    }

    if (activeStreaks === 0) {
      return;
    }

    for (let index = 0; index < streaks.length; index += 1) {
      const streak = streaks[index];

      if (!streak.state.active) {
        continue;
      }

      streak.state.elapsed += frame.delta;
      streak.state.position.addScaledVector(streak.state.velocity, frame.delta);
      streak.mesh.position.copy(streak.state.position);
      streak.material.opacity = Math.max(0, (1 - streak.state.elapsed / streak.state.life) * streak.state.baseOpacity);

      if (streak.state.elapsed >= streak.state.life) {
        streak.state.active = false;
        activeStreaks = Math.max(0, activeStreaks - 1);
        streak.mesh.visible = false;
        streak.material.opacity = 0;
      }
    }
  }

  function getActivePositions() {
    _posResult.length = 0;
    for (let i = 0, bi = 0; i < ships.length; i++) {
      const s = ships[i];
      if (s.state.active) {
        const o = _posObjects[bi++];
        o.id   = s.state.id;
        o.x    = s.state.position.x;
        o.y    = s.state.position.y;
        o.z    = s.state.position.z;
        o.kind = s.state.kind;
        _posResult.push(o);
      }
    }
    return _posResult;
  }

  function killShipAt(id) {
    for (let i = 0; i < ships.length; i++) {
      if (ships[i].state.id === id && ships[i].state.active) {
        resetShip(ships[i]);
        break;
      }
    }
  }

  function getActiveStreaks() {
    _strkResult.length = 0;
    for (let i = 0, bi = 0; i < streaks.length; i++) {
      const s = streaks[i];
      if (s.state.active) {
        const o = _strkObjects[bi++];
        o.x = s.state.position.x;
        o.y = s.state.position.y;
        o.z = s.state.position.z;
        _strkResult.push(o);
      }
    }
    return _strkResult;
  }

  function triggerAttackOnPlayer(playerPos) {
    // Pick a random active enemy to fire at the player
    const attacker = pickActiveShip("enemy");
    if (!attacker) return;
    const streak = acquireInactiveStreak();
    if (!streak) return;

    // Direction from attacker to player (xy only — streaks are 2D)
    tempTargetDirection.set(
      playerPos.x - attacker.state.position.x,
      playerPos.y - attacker.state.position.y,
      0
    ).normalize();

    tempShotSide.set(-tempTargetDirection.y, tempTargetDirection.x, 0)
      .normalize().multiplyScalar(randomBetween(-0.12, 0.12));
    tempShotOrigin.copy(attacker.state.position)
      .addScaledVector(tempTargetDirection, 0.62)
      .add(tempShotSide);

    streak.state.active = true;
    activeStreaks += 1;
    streak.state.elapsed = 0;
    streak.state.life = randomBetween(0.34, 0.58);
    streak.state.baseOpacity = 0.32 * quality.glowStrength;
    streak.state.position.copy(tempShotOrigin);
    streak.state.velocity.set(
      tempTargetDirection.x * randomBetween(17, 26) * quality.motionScale,
      tempTargetDirection.y * randomBetween(17, 26) * quality.motionScale,
      tempTargetDirection.z * randomBetween(17, 26) * quality.motionScale
    );
    streak.mesh.position.copy(streak.state.position);
    streak.mesh.rotation.z = Math.atan2(tempTargetDirection.y, tempTargetDirection.x);
    streak.mesh.visible = true;
    streak.material.color.set("#ff6030");
    streak.material.opacity = streak.state.baseOpacity;
    streak.mesh.scale.x = randomBetween(0.84, 1.08);
    streak.mesh.scale.y = randomBetween(0.9, 1.22);

    attacker.state.attackCooldown = randomBetween(3.2, 5.8);
    attacker.state.attackFlash = 0.9;
  }

  function destroy() {
    group.parent?.remove(group);

    for (let index = 0; index < ships.length; index += 1) {
      ships[index].materials.forEach((material) => material.dispose());
    }

    for (let index = 0; index < streaks.length; index += 1) {
      streaks[index].material.dispose();
    }

    shared.fuselageGeo.dispose();
    shared.noseGeo.dispose();
    shared.wingGeo.dispose();
    shared.nacelleGeo.dispose();
    shared.bellGeo.dispose();
    shared.trailGeometry.dispose();
    shared.streakGeometry.dispose();
    shared.hullMaterial.dispose();
    shared.wingMaterial.dispose();
    shared.nacelleMaterial.dispose();
    shared.bellMaterial.dispose();
  }

  return {
    object3d: group,
    destroy,
    getActiveCounts,
    getActivePositions,
    getActiveStreaks,
    killShipAt,
    spawnEnemy,
    spawnHero,
    triggerAttackOnPlayer,
    update
  };
}
