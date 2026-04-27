import { randomBetween } from "./motion.js";

function buildExplosion(THREE, glowTex, count) {
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const age = new Float32Array(count);

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(col, 3);
  geo.setAttribute("position", posAttr);
  geo.setAttribute("color", colAttr);

  const mat = new THREE.PointsMaterial({
    size: 0.16, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0.9, vertexColors: true
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.visible = false;

  const flashMat = new THREE.SpriteMaterial({
    map: glowTex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0
  });
  const flash = new THREE.Sprite(flashMat);
  flash.scale.setScalar(3.5);

  const grp = new THREE.Group();
  grp.add(pts, flash);
  grp.visible = false;

  return { grp, pts, flash, flashMat, mat, geo, posAttr, colAttr,
           pos, vel, col, age, count, active: false, elapsed: 0, duration: 1 };
}

export function createExplosions({ THREE, quality, textures }) {
  const grp   = new THREE.Group();
  const POOL  = quality.name === "high" ? 10 : quality.name === "medium" ? 6 : 4;
  const PER   = quality.name === "high" ? 90 : quality.name === "medium" ? 55 : 32;
  const pool  = Array.from({ length: POOL }, () => buildExplosion(THREE, textures.glow, PER));
  pool.forEach(e => grp.add(e.grp));

  function spawn(x, y, z, type = "ship") {
    const exp = pool.find(e => !e.active);
    if (!exp) return;

    exp.active = true;
    exp.elapsed = 0;
    exp.duration = type === "asteroid" ? 1.4 : type === "powerup" ? 0.7 : type === "spark" ? 0.52 : 1.0;
    exp.grp.position.set(x, y, z);
    exp.grp.visible = true;
    exp.pts.visible = true;

    // Colour scheme per type
    let r1, g1, b1, fColor;
    if (type === "asteroid")  { r1 = 0.7;  g1 = 0.55; b1 = 0.3;  fColor = 0x886633; }
    else if (type === "powerup") { r1 = 0.4;  g1 = 1.0;  b1 = 0.6;  fColor = 0x00ffaa; }
    else if (type === "spark")   { r1 = 0.55; g1 = 0.75; b1 = 1.0;  fColor = 0x44aaff; } // blue shield sparks
    else                         { r1 = 1.0;  g1 = 0.48; b1 = 0.08; fColor = 0xff5500; } // ship

    exp.flashMat.color.setHex(fColor);
    exp.flashMat.opacity = 1;
    exp.flash.scale.setScalar(type === "ship" ? 5 : type === "spark" ? 1.8 : 3);

    const spdMin = type === "ship" ? 2 : type === "spark" ? 1.8 : 1.2;
    const spdMax = type === "ship" ? 9 : type === "spark" ? 5   : 5.5;

    for (let i = 0; i < exp.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elev  = (Math.random() - 0.5) * Math.PI;
      const spd   = randomBetween(spdMin, spdMax);
      const i3 = i * 3;
      exp.pos[i3] = exp.pos[i3 + 1] = exp.pos[i3 + 2] = 0;
      exp.vel[i3]     = Math.cos(angle) * Math.cos(elev) * spd;
      exp.vel[i3 + 1] = Math.sin(elev) * spd;
      exp.vel[i3 + 2] = Math.sin(angle) * Math.cos(elev) * spd * 0.38;
      exp.age[i] = Math.random() * 0.08;
      const br = 0.68 + Math.random() * 0.32;
      exp.col[i3]     = r1 * br;
      exp.col[i3 + 1] = g1 * br * (0.55 + Math.random() * 0.45);
      exp.col[i3 + 2] = b1 * br * (0.4  + Math.random() * 0.6);
    }
    exp.posAttr.needsUpdate = true;
    exp.colAttr.needsUpdate = true;
  }

  function update(delta) {
    for (const exp of pool) {
      if (!exp.active) continue;
      exp.elapsed += delta;
      const t = exp.elapsed / exp.duration;

      if (t >= 1) { exp.active = false; exp.grp.visible = false; continue; }

      exp.flashMat.opacity = Math.max(0, 1 - t * 7);
      exp.flash.scale.setScalar(3 + t * 4);
      exp.mat.opacity = Math.max(0, 1 - t * 1.15);
      exp.mat.size    = 0.1 + t * 0.22;

      const drag = Math.pow(0.91, delta * 60);
      for (let i = 0; i < exp.count; i++) {
        exp.age[i] += delta;
        const i3 = i * 3;
        exp.vel[i3]     *= drag;
        exp.vel[i3 + 1] *= drag;
        exp.vel[i3 + 2] *= drag;
        exp.pos[i3]     += exp.vel[i3]     * delta;
        exp.pos[i3 + 1] += exp.vel[i3 + 1] * delta;
        exp.pos[i3 + 2] += exp.vel[i3 + 2] * delta;
      }
      exp.posAttr.needsUpdate = true;
    }
  }

  function destroy() {
    grp.parent?.remove(grp);
    for (const e of pool) {
      e.geo.dispose(); e.mat.dispose(); e.flashMat.dispose();
    }
  }

  return { object3d: grp, spawn, update, destroy };
}
