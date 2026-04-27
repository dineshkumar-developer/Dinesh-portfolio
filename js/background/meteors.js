import { randomBetween, pickOne, randomSign } from "./motion.js";

export function createMeteors({ THREE, quality, textures }) {
  const group = new THREE.Group();
  const POOL  = quality.name === "high" ? 12 : quality.name === "medium" ? 7 : 4;
  const MAX_ACTIVE = Math.ceil(POOL * 0.72);

  // Three size classes of shared geometry
  const geoS = new THREE.DodecahedronGeometry(0.36, 0);
  const geoM = new THREE.DodecahedronGeometry(0.68, 0);
  const geoL = new THREE.DodecahedronGeometry(1.18, 0);
  const geos  = [geoS, geoM, geoL];

  const ROCK_COLORS  = ["#7a6248", "#8c7355", "#9e8466", "#6b5540", "#b09070", "#836148", "#c4a882"];
  const FIRE_COLORS  = [0xff6600, 0xff8c00, 0xffaa00, 0xff4400, 0xffcc44];

  const tempDir = new THREE.Vector3();
  const meteors = [];
  let spawnTimer = randomBetween(0.8, 2.5);
  let activeCount = 0;

  for (let i = 0; i < POOL; i++) {
    const geo    = geos[i % 3];
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x7a6248, roughness: 0.88, metalness: 0.08, flatShading: true
    });
    const rock = new THREE.Mesh(geo, rockMat);

    // Orange glow halo (fast meteors)
    const haloMat = new THREE.SpriteMaterial({
      map: textures.glow, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0
    });
    const halo = new THREE.Sprite(haloMat);

    // Elongated fire tail behind meteor
    const tailMat = new THREE.SpriteMaterial({
      map: textures.glow, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0
    });
    const tail = new THREE.Sprite(tailMat);

    const pivot = new THREE.Group();
    pivot.add(rock, halo, tail);
    pivot.visible = false;
    group.add(pivot);

    meteors.push({
      pivot, rock, halo, haloMat, tail, tailMat, rockMat,
      active: false, id: i,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      rotX: 0, rotY: 0, rotZ: 0,
      spinX: 0, spinY: 0, spinZ: 0,
      speed: 0, scale: 1,
      life: 0, elapsed: 0,
      hasFire: false, fireColor: 0xff6600,
      shootable: false
    });
  }

  function seedMeteor(state) {
    const side = Math.floor(Math.random() * 4);
    const z    = randomBetween(-32, -8);
    let sx, sy, tx, ty;

    switch (side) {
      case 0: sx = -44; sy = randomBetween(-13, 13); tx =  30 + randomBetween(0, 14); ty = sy + randomBetween(-6, 6); break;
      case 1: sx =  44; sy = randomBetween(-13, 13); tx = -30 - randomBetween(0, 14); ty = sy + randomBetween(-6, 6); break;
      case 2: sx = randomBetween(-34, 34); sy =  19; tx = sx + randomBetween(-10, 10); ty = -13; break;
      default: sx = randomBetween(-34, 34); sy = -19; tx = sx + randomBetween(-10, 10); ty =  13; break;
    }

    state.speed = randomBetween(2.2, 9);
    state.hasFire = state.speed > 5.0;
    state.scale   = randomBetween(0.22, 0.88);
    state.position.set(sx, sy, z);

    const dx = tx - sx, dy = ty - sy, dz = randomBetween(-1.8, 0.9);
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
    state.velocity.set(
      (dx / len) * state.speed,
      (dy / len) * state.speed,
      (dz / len) * state.speed * 0.28
    );

    state.rotX = randomBetween(0, Math.PI * 2);
    state.rotY = randomBetween(0, Math.PI * 2);
    state.rotZ = randomBetween(0, Math.PI * 2);
    state.spinX = randomBetween(0.2, 1.2) * randomSign();
    state.spinY = randomBetween(0.15, 1.0) * randomSign();
    state.spinZ = randomBetween(0.1, 0.7) * randomSign();

    state.fireColor = pickOne(FIRE_COLORS);
    state.rockMat.color.set(pickOne(ROCK_COLORS));

    // Only fast meteors are interactive (shootable/collidable)
    state.shootable = state.hasFire && Math.random() < 0.55;

    state.life    = randomBetween(8, 22);
    state.elapsed = 0;
    state.active  = true;
    activeCount++;

    state.pivot.scale.setScalar(state.scale);
    state.pivot.visible = true;
  }

  function resetMeteor(state) {
    if (!state.active) return;
    state.active = false;
    activeCount  = Math.max(0, activeCount - 1);
    state.pivot.visible = false;
    state.haloMat.opacity = 0;
    state.tailMat.opacity = 0;
  }

  function update(frame) {
    const delta       = frame.delta;
    const warpBoost   = 1 + (frame.warp?.strength || 0) * 0.22;

    group.position.x = (frame.camera?.driftX || 0) * 0.12;
    group.position.y = (frame.camera?.driftY || 0) * 0.07;

    // Self-managed spawning
    spawnTimer -= delta;
    if (spawnTimer <= 0 && activeCount < MAX_ACTIVE) {
      for (const m of meteors) {
        if (!m.active) { seedMeteor(m); break; }
      }
      spawnTimer = randomBetween(1.4, 4.5);
    }

    for (const m of meteors) {
      if (!m.active) continue;

      m.elapsed += delta;

      m.position.x += m.velocity.x * warpBoost * delta;
      m.position.y += m.velocity.y * warpBoost * delta;
      m.position.z += m.velocity.z * warpBoost * delta;

      m.rotX += m.spinX * delta;
      m.rotY += m.spinY * delta;
      m.rotZ += m.spinZ * delta;

      m.pivot.position.copy(m.position);
      m.rock.rotation.set(m.rotX, m.rotY, m.rotZ);

      if (m.elapsed >= m.life ||
          Math.abs(m.position.x) > 55 ||
          Math.abs(m.position.y) > 24) {
        resetMeteor(m);
        continue;
      }

      if (m.hasFire) {
        // Flickering fire trail
        const pulse     = 0.72 + Math.sin(frame.elapsed * 8.2 + m.elapsed * 4) * 0.28;
        const intensity = Math.min(1, (m.speed - 5.8) / 7) * pulse;

        // Halo around rock
        m.haloMat.color.setHex(m.fireColor);
        m.haloMat.opacity = intensity * 0.58;
        m.halo.scale.set(m.scale * 1.7, m.scale * 1.7, 1);

        // Elongated tail pointing backward along velocity
        tempDir.copy(m.velocity).normalize();
        const tailLen = m.scale * (2.8 + intensity * 3.2);
        m.tail.position.set(-tempDir.x * tailLen * 0.6, -tempDir.y * tailLen * 0.6, 0);
        m.tailMat.color.setHex(m.fireColor);
        m.tailMat.opacity = intensity * 0.48;
        m.tail.scale.set(m.scale * 0.72, tailLen, 1);
        m.tailMat.rotation = Math.atan2(m.velocity.y, m.velocity.x) + Math.PI / 2;
      } else {
        m.haloMat.opacity = 0;
        m.tailMat.opacity = 0;
      }
    }
  }

  // Returns positions of shootable interactive meteors
  function getInteractivePositions() {
    const out = [];
    for (const m of meteors) {
      if (m.active && m.shootable) {
        out.push({ id: m.id, x: m.position.x, y: m.position.y, z: m.position.z, scale: m.scale });
      }
    }
    return out;
  }

  function killAt(id) {
    for (const m of meteors) {
      if (m.id === id && m.active) { resetMeteor(m); return true; }
    }
    return false;
  }

  function destroy() {
    group.parent?.remove(group);
    geoS.dispose(); geoM.dispose(); geoL.dispose();
    for (const m of meteors) {
      m.rockMat.dispose(); m.haloMat.dispose(); m.tailMat.dispose();
    }
  }

  // Warmup: seed initial meteors scattered across scene
  const initCount = Math.ceil(POOL * 0.45);
  for (let i = 0; i < initCount && i < meteors.length; i++) {
    seedMeteor(meteors[i]);
    // Randomize their starting elapsed so they appear mid-flight
    meteors[i].elapsed = randomBetween(0, meteors[i].life * 0.6);
    meteors[i].position.x = randomBetween(-30, 30);
    meteors[i].position.y = randomBetween(-12, 12);
  }

  return { object3d: group, update, getInteractivePositions, killAt, destroy };
}
