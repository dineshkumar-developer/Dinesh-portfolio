import { randomBetween } from "./motion.js";

const SHIP_Z   = -7.5;
const BOUNDS   = { xMin: -15.5, xMax: 15.5, yMin: -9, yMax: 9 };
const ACCEL    = 30;
const DAMPING  = 0.84;
const MAX_SPD  = 13;
const SHOOT_CD = 0.13;

// ─── Ship mesh ────────────────────────────────────────────────────────────────

function buildMesh(THREE, glowTex) {
  const root = new THREE.Group();
  const mats = [];

  function std(o) {
    const m = new THREE.MeshStandardMaterial(o);
    mats.push(m);
    return m;
  }

  const hull     = std({ color: 0xc8d8ea, metalness: 0.76, roughness: 0.22 });
  const accent   = std({ color: 0x3a5a78, metalness: 0.84, roughness: 0.16 });
  const canopy   = std({ color: 0x44aaff, metalness: 0.08, roughness: 0.06,
                          transparent: true, opacity: 0.72,
                          emissive: new THREE.Color(0x001144), emissiveIntensity: 0.7 });
  const eng      = std({ color: 0x1a202e, metalness: 0.92, roughness: 0.08 });
  const wingMat  = std({ color: 0xaabcce, metalness: 0.72, roughness: 0.26 });
  const glowMat  = std({ color: 0x2288ff,
                          emissive: new THREE.Color(0x1166ee), emissiveIntensity: 2,
                          metalness: 0, roughness: 1 });

  function add(geo, mat, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, mat.clone());
    mats.push(m.material);
    m.position.set(px, py, pz);
    m.rotation.set(rx, ry, rz);
    root.add(m);
    return m;
  }

  // Fuselage (ship points +x = forward)
  add(new THREE.CylinderGeometry(0.11, 0.20, 1.35, 10),
      hull, 0, 0, 0, 0, 0, -Math.PI / 2);

  // Nose
  add(new THREE.ConeGeometry(0.11, 0.56, 10),
      hull, 0.97, 0, 0, 0, 0, -Math.PI / 2);

  // Cockpit dome
  add(new THREE.SphereGeometry(0.10, 12, 8),
      canopy, 0.22, 0, 0.135);

  // Delta wings
  add(new THREE.BoxGeometry(0.70, 0.026, 0.54),
      wingMat, -0.06, 0, 0.40, -0.28);
  add(new THREE.BoxGeometry(0.70, 0.026, 0.54),
      wingMat, -0.06, 0, -0.40, 0.28);

  // Wing gun pods
  const gunGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.44, 7);
  add(gunGeo, accent, 0.14, 0, 0.58, 0, 0, -Math.PI / 2);
  add(gunGeo, accent, 0.14, 0, -0.58, 0, 0, -Math.PI / 2);

  // Side nacelles
  const nacGeo = new THREE.CylinderGeometry(0.064, 0.082, 0.74, 8);
  add(nacGeo, accent, -0.36, 0, 0.31, 0, 0, -Math.PI / 2);
  add(nacGeo, accent, -0.36, 0, -0.31, 0, 0, -Math.PI / 2);

  // Side engine bells
  const bellGeo = new THREE.CylinderGeometry(0.090, 0.066, 0.14, 10);
  add(bellGeo, eng, -0.78, 0, 0.31, 0, 0, -Math.PI / 2);
  add(bellGeo, eng, -0.78, 0, -0.31, 0, 0, -Math.PI / 2);

  // Centre main engine nacelle
  add(new THREE.CylinderGeometry(0.10, 0.16, 0.60, 10),
      accent, -0.52, 0, 0, 0, 0, -Math.PI / 2);

  // Centre engine bell
  add(new THREE.CylinderGeometry(0.155, 0.10, 0.16, 10),
      eng, -0.90, 0, 0, 0, 0, -Math.PI / 2);

  // Dorsal fin
  add(new THREE.BoxGeometry(0.38, 0.20, 0.026),
      wingMat, -0.12, 0.17, 0, Math.PI / 2);

  // Hull accent stripe (emissive)
  add(new THREE.CylinderGeometry(0.021, 0.021, 1.38, 6),
      std({ color: 0x0077dd, emissive: new THREE.Color(0x0044aa),
            emissiveIntensity: 1.0, metalness: 0.3, roughness: 0.4 }),
      0, 0, 0.197, 0, 0, -Math.PI / 2);

  // Glow rings on each engine bell
  const rGeo  = new THREE.TorusGeometry(0.082, 0.011, 8, 18);
  const rGeoM = new THREE.TorusGeometry(0.135, 0.014, 8, 20);
  const glowL  = add(rGeo,  glowMat, -0.86, 0, 0.31);
  const glowR  = add(rGeo,  glowMat, -0.86, 0, -0.31);
  const glowC  = add(rGeoM, glowMat, -0.99, 0, 0);
  const glowRingMats = [glowL.material, glowR.material, glowC.material];

  // Sprite glow (additive) per engine
  function makeGlowSprite(color, px, pz, s) {
    const sm = new THREE.SpriteMaterial({
      map: glowTex, color,
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.72
    });
    const sp = new THREE.Sprite(sm);
    sp.position.set(px, 0, pz);
    sp.scale.set(s, s, 1);
    root.add(sp);
    return { sprite: sp, mat: sm };
  }

  const gsL = makeGlowSprite(0x2288ff, -0.91, 0.31, 0.52);
  const gsR = makeGlowSprite(0x2288ff, -0.91, -0.31, 0.52);
  const gsC = makeGlowSprite(0x44aaff, -1.02, 0, 0.76);

  // Engine point light
  const light = new THREE.PointLight(0x2266ff, 0, 3.8);
  light.position.set(-0.92, 0, 0);
  root.add(light);

  return {
    root, light,
    spriteMats: [gsL.mat, gsR.mat, gsC.mat],
    glowRingMats,
    mats
  };
}

// ─── Exhaust particles ────────────────────────────────────────────────────────

function buildExhaust(THREE, count) {
  const pos = new Float32Array(count * 3).fill(999);
  const vel = new Float32Array(count * 3);
  const age = new Float32Array(count).fill(99);

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", posAttr);

  const mat = new THREE.PointsMaterial({
    color: 0x88ccff, size: 0.09,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0.72
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;

  return { pts, pos, vel, age, posAttr, count, next: 0 };
}

// ─── Laser shots ──────────────────────────────────────────────────────────────

function buildShotPool(THREE, glowTex, count) {
  return Array.from({ length: count }, () => {
    const geo = new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00eeff, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.92
    });
    const glowM = new THREE.SpriteMaterial({
      map: glowTex, color: 0x0088ff,
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.52
    });
    const gsp = new THREE.Sprite(glowM);
    gsp.scale.set(0.32, 0.32, 1);
    const mesh = new THREE.Mesh(geo, mat);
    const grp = new THREE.Group();
    grp.add(mesh, gsp);
    grp.visible = false;
    return { grp, mat, glowM, vx: 0, vy: 0, life: 0, active: false };
  });
}

// ─── Power-up meshes ──────────────────────────────────────────────────────────

function buildPowerUp(THREE, type) {
  const colors = { shield: 0x00ffaa, rapidfire: 0xff4400, speed: 0xffdd00, health: 0xff44aa };
  const color = colors[type] || 0xffffff;
  const geo = new THREE.OctahedronGeometry(0.3, 0);
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: new THREE.Color(color), emissiveIntensity: 0.8,
    metalness: 0.5, roughness: 0.3, transparent: true, opacity: 0.9
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  return { mesh, mat, type };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function createPlayerShip({ THREE, quality, textures, canvas }) {
  const ship    = buildMesh(THREE, textures.glow);
  const exhaust = buildExhaust(THREE, quality.name === "high" ? 140 : 90);
  const SHOT_MAX = 24;
  const shotPool = buildShotPool(THREE, textures.glow, SHOT_MAX);
  const PUMAX = 4;
  const puPool = ["shield", "rapidfire", "speed", "health"].map(t => buildPowerUp(THREE, t));

  // Shield ripple sprite (expands outward on hit)
  const rippleMat = new THREE.SpriteMaterial({
    map: textures.glow, color: 0x44ccff,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0
  });
  const ripple = new THREE.Sprite(rippleMat);
  ship.root.add(ripple);
  let rippleT = 1; // 1 = idle/done, 0 = just triggered

  const root = new THREE.Group();
  root.add(ship.root, exhaust.pts);
  shotPool.forEach(s => root.add(s.grp));
  puPool.forEach(p => root.add(p.mesh));

  // Ship starts visible in idle mode
  ship.root.position.set(0, 0, SHIP_Z);
  ship.root.scale.setScalar(1.42);
  ship.root.visible = true;

  // ── game state ──
  const keys = new Set();
  let mouseGX = 0, mouseGY = 0;
  let shooting = false, shootTimer = 0;
  let touchId = null, touchJX = 0, touchJY = 0;

  let velX = 0, velY = 0, posX = 0, posY = 0;
  let bankAngle = 0;
  let health = 100, shield = 0;
  let active = false;
  let invincible = 0, rapidFire = 0, speedBoost = 0;

  let autoShootTimer = 0;
  let autoTargets = [];

  // ── idle AI state ──
  let idleState = "FLOAT"; // FLOAT | PATROL | DASH | RETREAT
  let idleTimer = randomBetween(2, 5);
  let idleTargetX = 0, idleTargetY = 0;
  let idleReturnX = 0, idleReturnY = 0;
  let idlePhase = randomBetween(0, Math.PI * 2);

  const activeShots = [];
  const activePUs   = [];

  // ── helpers ──
  function cw() {
    return { w: canvas?.clientWidth || window.innerWidth,
             h: canvas?.clientHeight || window.innerHeight };
  }

  function screenToWorld(sx, sy) {
    const { w, h } = cw();
    const depth = 20 - SHIP_Z;
    const tanH  = Math.tan(42 * Math.PI / 360);
    const halfH = depth * tanH;
    const halfW = halfH * (w / h);
    return {
      wx:  ((sx / w) * 2 - 1) * halfW,
      wy: -((sy / h) * 2 - 1) * halfH
    };
  }

  function flashDamageOverlay() {
    const el = document.getElementById("damage-flash");
    if (!el) return;
    el.classList.add("active");
    setTimeout(() => el.classList.remove("active"), 220);
  }

  function triggerShake() {
    const shell = document.querySelector(".scene-shell");
    if (!shell) return;
    shell.classList.remove("ship-hit-shake");
    void shell.offsetWidth; // reflow to restart animation
    shell.classList.add("ship-hit-shake");
  }

  function triggerRipple() {
    rippleT = 0;
  }

  // ── input handlers ──
  function onKeyDown(e) {
    keys.add(e.code);
    if (e.code === "Space") { shooting = true; e.preventDefault(); }
  }
  function onKeyUp(e) {
    keys.delete(e.code);
    if (e.code === "Space") shooting = false;
  }
  function onMouseMove(e) {
    if (!active) return;
    const { wx, wy } = screenToWorld(e.clientX, e.clientY);
    mouseGX = wx; mouseGY = wy;
  }
  function onMouseDown(e) { if (active && e.button === 0) shooting = true; }
  function onMouseUp(e)   { if (e.button === 0) shooting = false; }
  function onTouchStart(e) {
    if (!active) return;
    const { w } = cw();
    for (const t of e.changedTouches) {
      if (t.clientX < w * 0.5) { touchId = t.identifier; touchJX = t.clientX; touchJY = t.clientY; }
      else { shooting = true; }
    }
    e.preventDefault();
  }
  function onTouchMove(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) { touchJX = t.clientX; touchJY = t.clientY; }
    }
    e.preventDefault();
  }
  function onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) { touchId = null; }
    }
    shooting = false;
  }

  function addListeners() {
    window.addEventListener("keydown",    onKeyDown);
    window.addEventListener("keyup",      onKeyUp);
    window.addEventListener("mousemove",  onMouseMove);
    window.addEventListener("mousedown",  onMouseDown);
    window.addEventListener("mouseup",    onMouseUp);
    if (canvas) {
      canvas.addEventListener("touchstart", onTouchStart, { passive: false });
      canvas.addEventListener("touchmove",  onTouchMove,  { passive: false });
      canvas.addEventListener("touchend",   onTouchEnd);
    }
  }
  function removeListeners() {
    window.removeEventListener("keydown",   onKeyDown);
    window.removeEventListener("keyup",     onKeyUp);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mouseup",   onMouseUp);
    if (canvas) {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove",  onTouchMove);
      canvas.removeEventListener("touchend",   onTouchEnd);
    }
  }

  // ── shooting ──
  function fireShot() {
    const s = shotPool.find(s => !s.active);
    if (!s) return;
    const aimX = mouseGX || posX + 20;
    const aimY = mouseGY || posY;
    const dx = aimX - posX, dy = aimY - posY;
    const len = Math.sqrt(dx * dx + dy * dy) + 0.001;
    s.active = true;
    s.vx = (dx / len) * 30;
    s.vy = (dy / len) * 30;
    s.life = 1.6;
    s.grp.position.set(posX + (dx / len) * 1.3, posY + (dy / len) * 1.3, SHIP_Z);
    s.grp.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
    s.grp.visible = true;
    s.mat.opacity   = 0.92;
    s.glowM.opacity = 0.52;
    activeShots.push(s);
  }

  // ── exhaust ──
  function emitExhaust(delta) {
    const n = Math.round(delta * 130);
    for (let i = 0; i < n; i++) {
      const idx = exhaust.next;
      exhaust.next = (exhaust.next + 1) % exhaust.count;
      const angle = Math.PI + (Math.random() - 0.5) * 0.55;
      const spd   = randomBetween(1.4, 4.2);
      const i3 = idx * 3;
      exhaust.pos[i3]     = posX + Math.cos(angle) * 0.14;
      exhaust.pos[i3 + 1] = posY + (Math.random() - 0.5) * 0.28;
      exhaust.pos[i3 + 2] = SHIP_Z + (Math.random() - 0.5) * 0.2;
      exhaust.vel[i3]     = Math.cos(angle) * spd;
      exhaust.vel[i3 + 1] = (Math.random() - 0.5) * 1.1;
      exhaust.vel[i3 + 2] = (Math.random() - 0.5) * 0.5;
      exhaust.age[idx]    = 0;
    }
  }

  function updateExhaust(delta) {
    for (let i = 0; i < exhaust.count; i++) {
      if (exhaust.age[i] >= 0.65) continue;
      exhaust.age[i] += delta;
      const i3 = i * 3;
      if (exhaust.age[i] >= 0.65) {
        exhaust.pos[i3] = exhaust.pos[i3 + 1] = exhaust.pos[i3 + 2] = 999;
        continue;
      }
      const drag = Math.pow(0.88, delta * 60);
      exhaust.vel[i3] *= drag;
      exhaust.vel[i3 + 1] *= drag;
      exhaust.vel[i3 + 2] *= drag;
      exhaust.pos[i3]     += exhaust.vel[i3]     * delta;
      exhaust.pos[i3 + 1] += exhaust.vel[i3 + 1] * delta;
      exhaust.pos[i3 + 2] += exhaust.vel[i3 + 2] * delta;
    }
    exhaust.posAttr.needsUpdate = true;
  }

  // ── idle AI update (called when not in game mode) ──────────────────────────
  function idleUpdate(frame) {
    const delta = frame.delta;
    idlePhase += delta;
    idleTimer = Math.max(0, idleTimer - delta);

    let thrusting = false;

    switch (idleState) {
      case "FLOAT": {
        // Lissajous drift with fast-enough frequencies to produce visible motion
        const tx = Math.sin(idlePhase * 0.44) * 6.5 + Math.cos(idlePhase * 0.27) * 2.4;
        const ty = Math.cos(idlePhase * 0.58) * 3.8 + Math.sin(idlePhase * 0.36) * 1.4;
        const dxF = tx - posX, dyF = ty - posY;
        const distF = Math.sqrt(dxF * dxF + dyF * dyF) + 0.001;
        const forceF = Math.min(distF, 8) * 0.72;
        velX += (dxF / distF) * forceF * delta;
        velY += (dyF / distF) * forceF * delta;

        if (idleTimer <= 0) {
          const r = Math.random();
          if (r < 0.28) {
            idleReturnX = posX; idleReturnY = posY;
            idleTargetX = randomBetween(5, 12);
            idleTargetY = randomBetween(-3, 3);
            idleState = "DASH";
            idleTimer = randomBetween(1.2, 2.2);
          } else if (r < 0.62) {
            idleTargetX = randomBetween(-8, 8);
            idleTargetY = randomBetween(-4, 4);
            idleState = "PATROL";
            idleTimer = randomBetween(2.5, 5);
          } else {
            idleTimer = randomBetween(2, 4.5);
          }
        }
        break;
      }
      case "PATROL": {
        thrusting = true;
        const dxP = idleTargetX - posX, dyP = idleTargetY - posY;
        const distP = Math.sqrt(dxP * dxP + dyP * dyP) + 0.001;
        const forceP = Math.min(distP, 12) * 1.8;
        velX += (dxP / distP) * forceP * delta;
        velY += (dyP / distP) * forceP * delta;

        if (distP < 1.2 || idleTimer <= 0) {
          idleState = "FLOAT";
          idleTimer = randomBetween(2, 5);
        }
        break;
      }
      case "DASH": {
        thrusting = true;
        const dxD = idleTargetX - posX, dyD = idleTargetY - posY;
        const distD = Math.sqrt(dxD * dxD + dyD * dyD) + 0.001;
        const forceD = Math.min(distD, 16) * 5.5;
        velX += (dxD / distD) * forceD * delta;
        velY += (dyD / distD) * forceD * delta;

        if (distD < 2.0 || idleTimer <= 0) {
          idleState = "RETREAT";
          idleTargetX = idleReturnX;
          idleTargetY = idleReturnY;
          idleTimer = randomBetween(2, 3.8);
        }
        break;
      }
      case "RETREAT": {
        thrusting = true;
        const dxR = idleTargetX - posX, dyR = idleTargetY - posY;
        const distR = Math.sqrt(dxR * dxR + dyR * dyR) + 0.001;
        const forceR = Math.min(distR, 13) * 2.2;
        velX += (dxR / distR) * forceR * delta;
        velY += (dyR / distR) * forceR * delta;

        if (distR < 2.0 || idleTimer <= 0) {
          idleState = "FLOAT";
          idleTimer = randomBetween(3, 7);
        }
        break;
      }
    }

    // Physics — lighter damping so momentum carries through visible arcs
    const idleDamp = Math.pow(idleState === "DASH" ? 0.68 : 0.86, delta * 60);
    velX *= idleDamp; velY *= idleDamp;
    const maxIdleSpd = idleState === "DASH" ? MAX_SPD * 0.92 : MAX_SPD * 0.52;
    const sv = Math.sqrt(velX * velX + velY * velY);
    if (sv > maxIdleSpd) { velX = (velX / sv) * maxIdleSpd; velY = (velY / sv) * maxIdleSpd; }

    const idleB = 0.58;
    posX = Math.max(BOUNDS.xMin * idleB, Math.min(BOUNDS.xMax * idleB, posX + velX * delta));
    posY = Math.max(BOUNDS.yMin * idleB, Math.min(BOUNDS.yMax * idleB, posY + velY * delta));

    // Decay invincibility so the ship can be hit again after a cooldown
    invincible = Math.max(0, invincible - delta);

    // Auto-fire at nearest target
    autoShootTimer = Math.max(0, autoShootTimer - delta);
    if (autoShootTimer <= 0 && autoTargets.length > 0) {
      let nearest = null, nearestDist = Infinity;
      for (const t of autoTargets) {
        if (t.kind === "hero") continue; // never shoot friendlies
        const dx = t.x - posX, dy = t.y - posY;
        const d = dx * dx + dy * dy;
        if (d < nearestDist) { nearestDist = d; nearest = t; }
      }
      if (nearest && nearestDist < 420) {
        mouseGX = nearest.x;
        mouseGY = nearest.y;
        fireShot();
        autoShootTimer = SHOOT_CD * (3 + Math.random() * 2.5);
      }
    }

    // Update active shots in idle/auto mode
    for (let i = activeShots.length - 1; i >= 0; i--) {
      const s = activeShots[i];
      s.life -= delta;
      if (s.life <= 0 || Math.abs(s.grp.position.x) > 26 || Math.abs(s.grp.position.y) > 16) {
        s.active = false; s.grp.visible = false; activeShots.splice(i, 1); continue;
      }
      s.grp.position.x += s.vx * delta;
      s.grp.position.y += s.vy * delta;
      const fade = Math.min(1, s.life * 1.8);
      s.mat.opacity   = fade * 0.92;
      s.glowM.opacity = fade * 0.52;
    }

    // Hover bob — small sinusoidal lift independent of physics
    const bob = Math.sin(frame.elapsed * 1.6) * 0.18 + Math.sin(frame.elapsed * 2.7) * 0.07;

    // Banking: roll into turns, tilt nose toward velocity direction
    const tBank = -velY * 0.11;
    bankAngle += (tBank - bankAngle) * Math.min(1, delta * 4.5);
    ship.root.position.set(posX, posY + bob, SHIP_Z);
    ship.root.rotation.z = Math.atan2(velY, velX) * 0.52 + Math.sin(idlePhase * 0.38) * 0.06;
    ship.root.rotation.x = bankAngle;
    ship.root.rotation.y = -velX * 0.018 + Math.sin(idlePhase * 0.55) * 0.04;

    // Engine glow — speed-reactive: brightens as the ship moves faster
    const speedFrac = Math.min(1, sv / (MAX_SPD * 0.52));
    const pulse = 0.52 + Math.sin(frame.elapsed * 7.2 + 1.2) * 0.18;
    const ei = thrusting ? pulse * (0.72 + speedFrac * 0.28) : pulse * (0.28 + speedFrac * 0.22);
    ship.light.intensity = ei * 1.1;
    ship.spriteMats[0].opacity = ei * 0.72;
    ship.spriteMats[1].opacity = ei * 0.72;
    ship.spriteMats[2].opacity = ei * 0.92;
    for (const m of ship.glowRingMats) m.emissiveIntensity = ei * 1.8;

    // Exhaust — always emits at base rate, scales with speed and thrusting
    const exhaustRate = 0.18 + speedFrac * 0.42 + (idleState === "DASH" ? 0.4 : 0);
    emitExhaust(delta * exhaustRate);
    updateExhaust(delta);

    // Shield ripple animation
    if (rippleT < 1) {
      rippleT = Math.min(1, rippleT + delta / 0.46);
      const rs = 1.1 + rippleT * 4.8;
      ripple.scale.set(rs, rs, 1);
      rippleMat.opacity = Math.max(0, 0.72 * (1 - rippleT));
    } else {
      rippleMat.opacity = 0;
    }

    ship.root.visible = true;
  }

  // ── game update ──
  function update(frame) {
    if (!active) {
      idleUpdate(frame);
      return getState();
    }

    const delta = frame.delta;
    const spd   = speedBoost > 0 ? 1.55 : 1;

    shootTimer   = Math.max(0, shootTimer - delta);
    invincible   = Math.max(0, invincible - delta);
    rapidFire    = Math.max(0, rapidFire - delta);
    speedBoost   = Math.max(0, speedBoost - delta);

    // ─ Input ─
    let ax = 0, ay = 0, thrusting = false;
    if (touchId !== null) {
      const { w, h } = cw();
      const dx = touchJX - w * 0.25, dy = touchJY - h * 0.62;
      const d  = Math.sqrt(dx * dx + dy * dy);
      const dead = 18, max = Math.min(w, h) * 0.14;
      if (d > dead) {
        const sc = Math.min(1, d / max);
        ax = (dx / d) * sc; ay = -(dy / d) * sc; thrusting = true;
      }
    } else {
      if (keys.has("KeyW") || keys.has("ArrowUp"))    { ay += 1; thrusting = true; }
      if (keys.has("KeyS") || keys.has("ArrowDown"))  { ay -= 1; thrusting = true; }
      if (keys.has("KeyA") || keys.has("ArrowLeft"))  { ax -= 1; thrusting = true; }
      if (keys.has("KeyD") || keys.has("ArrowRight")) { ax += 1; thrusting = true; }
    }
    const il = Math.sqrt(ax * ax + ay * ay);
    if (il > 1) { ax /= il; ay /= il; }

    // ─ Physics ─
    velX += ax * ACCEL * spd * delta;
    velY += ay * ACCEL * spd * delta;
    const damp = Math.pow(DAMPING, delta * 60);
    velX *= damp; velY *= damp;
    const maxS = MAX_SPD * spd;
    const sv = Math.sqrt(velX * velX + velY * velY);
    if (sv > maxS) { velX = (velX / sv) * maxS; velY = (velY / sv) * maxS; }

    posX = Math.max(BOUNDS.xMin, Math.min(BOUNDS.xMax, posX + velX * delta));
    posY = Math.max(BOUNDS.yMin, Math.min(BOUNDS.yMax, posY + velY * delta));

    const tBank = -velY * 0.055;
    bankAngle += (tBank - bankAngle) * Math.min(1, delta * 5.5);

    ship.root.position.set(posX, posY, SHIP_Z);
    ship.root.rotation.z = Math.atan2(velY, velX) * 0.38;
    ship.root.rotation.x = bankAngle;
    ship.root.rotation.y = -velX * 0.013;

    // ─ Engine glow ─
    const pulse = 0.82 + Math.sin(frame.elapsed * 9) * 0.18;
    const ei    = thrusting ? pulse : pulse * 0.38;
    ship.light.intensity = ei * 1.4;
    ship.spriteMats[0].opacity = ei * 0.78;
    ship.spriteMats[1].opacity = ei * 0.78;
    ship.spriteMats[2].opacity = ei * 0.92;
    for (const m of ship.glowRingMats) m.emissiveIntensity = ei * 2;

    // ─ Exhaust ─
    if (thrusting) emitExhaust(delta);
    updateExhaust(delta);

    // ─ Shoot ─
    const cd = rapidFire > 0 ? SHOOT_CD * 0.32 : SHOOT_CD;
    if (shooting && shootTimer <= 0) { fireShot(); shootTimer = cd; }

    // ─ Update shots ─
    for (let i = activeShots.length - 1; i >= 0; i--) {
      const s = activeShots[i];
      s.life -= delta;
      if (s.life <= 0 || Math.abs(s.grp.position.x) > 26 || Math.abs(s.grp.position.y) > 16) {
        s.active = false; s.grp.visible = false; activeShots.splice(i, 1); continue;
      }
      s.grp.position.x += s.vx * delta;
      s.grp.position.y += s.vy * delta;
      const fade = Math.min(1, s.life * 1.8);
      s.mat.opacity   = fade * 0.92;
      s.glowM.opacity = fade * 0.52;
    }

    // ─ Power-up rotation ─
    for (const pu of activePUs) {
      pu.mesh.rotation.y += delta * 1.8;
      pu.mesh.rotation.x += delta * 0.9;
    }

    // ─ Invincibility flash ─
    ship.root.visible = invincible <= 0 || Math.floor(frame.elapsed * 10) % 2 === 0;

    // Shield ripple animation
    if (rippleT < 1) {
      rippleT = Math.min(1, rippleT + delta / 0.46);
      const rs = 1.1 + rippleT * 4.8;
      ripple.scale.set(rs, rs, 1);
      rippleMat.opacity = Math.max(0, 0.72 * (1 - rippleT));
    } else {
      rippleMat.opacity = 0;
    }

    return getState();
  }

  // ── damage / power-ups ──
  function takeDamage(amount) {
    if (invincible > 0) return false;

    flashDamageOverlay();
    triggerShake();
    triggerRipple();

    if (shield > 0) {
      shield = Math.max(0, shield - amount * 1.5);
      invincible = 0.7;
      return false;
    }

    // Ship NEVER dies — health clamps at 1
    health = Math.max(1, health - amount);
    invincible = 1.1;
    return false; // always survives
  }

  function applyPowerUp(type) {
    if (type === "shield")    { shield = Math.min(100, shield + 80); }
    if (type === "rapidfire") { rapidFire  = 6; }
    if (type === "speed")     { speedBoost = 5; }
    if (type === "health")    { health     = Math.min(100, health + 35); }
  }

  function spawnPowerUp(x, y, z, type) {
    const pu = puPool.find(p => !p.mesh.visible && !activePUs.includes(p));
    if (!pu) return;
    pu.type = type;
    pu.mesh.position.set(x, y, z);
    pu.mesh.visible = true;
    pu.life = 9;
    activePUs.push(pu);
  }

  function updatePowerUps(delta) {
    for (let i = activePUs.length - 1; i >= 0; i--) {
      activePUs[i].life -= delta;
      if (activePUs[i].life <= 0) {
        activePUs[i].mesh.visible = false;
        activePUs.splice(i, 1);
      }
    }
  }

  function checkPowerUpCollect() {
    const collected = [];
    for (let i = activePUs.length - 1; i >= 0; i--) {
      const pu = activePUs[i];
      const dx = pu.mesh.position.x - posX;
      const dy = pu.mesh.position.y - posY;
      if (Math.sqrt(dx * dx + dy * dy) < 1.1) {
        applyPowerUp(pu.type);
        pu.mesh.visible = false;
        collected.push(pu.type);
        activePUs.splice(i, 1);
      }
    }
    return collected;
  }

  // ── lifecycle ──
  function activate() {
    active = true; health = 100; shield = 0;
    posX = 0; posY = 0; velX = 0; velY = 0;
    bankAngle = 0;
    invincible = 2; rapidFire = 0; speedBoost = 0;
    for (const p of activePUs) p.mesh.visible = false;
    activePUs.length = 0;
    ship.root.visible = true;
    addListeners();
  }

  function deactivate() {
    active = false;
    // Return to idle AI — ship stays visible
    idleState = "FLOAT";
    idleTimer = randomBetween(2, 4);
    velX *= 0.15; velY *= 0.15;
    for (const s of activeShots) { s.active = false; s.grp.visible = false; }
    activeShots.length = 0;
    removeListeners();
  }

  function getState() {
    return { posX, posY, health, shield, active,
             invincible: invincible > 0, rapidFire: rapidFire > 0, speedBoost: speedBoost > 0 };
  }

  function destroy() {
    deactivate();
    for (const m of ship.mats)       m.dispose();
    for (const m of ship.spriteMats) m.dispose();
    rippleMat.dispose();
    exhaust.pts.geometry.dispose();
    exhaust.pts.material.dispose();
    for (const s of shotPool) {
      s.grp.children.forEach(c => { c.geometry?.dispose(); c.material?.dispose(); });
    }
    for (const p of puPool) {
      p.mesh.geometry.dispose(); p.mat.dispose();
    }
  }

  return {
    object3d: root,
    activate, deactivate, destroy,
    update,
    takeDamage,
    applyPowerUp,
    spawnPowerUp, updatePowerUps, checkPowerUpCollect,
    getState,
    getShots:        () => activeShots,
    getBounds:       () => BOUNDS,
    getZ:            () => SHIP_Z,
    setAutoTargets:  (positions) => { autoTargets = positions || []; }
  };
}
