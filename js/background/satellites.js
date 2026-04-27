import { randomBetween } from "./motion.js";

const ORBIT_CONFIGS = [
  { cx: -9, cy: 2.8, radius: 7.2, speed: 0.058, inc: 0.32, depth: -19, scale: 0.88, tint: "#8ab8d4", panelTint: "#1a4070" },
  { cx: 5, cy: -3.4, radius: 8.8, speed: -0.044, inc: -0.52, depth: -23, scale: 0.72, tint: "#a4c8e4", panelTint: "#163660" },
  { cx: -2, cy: 5.2, radius: 5.4, speed: 0.092, inc: 0.68, depth: -16, scale: 1.08, tint: "#7aaecf", panelTint: "#1c4878" },
  { cx: 11, cy: 0.4, radius: 7.8, speed: -0.068, inc: 0.14, depth: -21, scale: 0.8, tint: "#c4d8f0", panelTint: "#22527a" },
  { cx: -13, cy: -2.4, radius: 6.2, speed: 0.054, inc: -0.28, depth: -18, scale: 1.0, tint: "#b0d0e8", panelTint: "#1e4a72" },
];

function buildSatellite(THREE, textures, cfg) {
  const root = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(0.16, 0.07, 0.08);
  const panelGeo = new THREE.PlaneGeometry(0.46, 0.18);
  const diskGeo = new THREE.CylinderGeometry(0.035, 0.032, 0.06, 8);
  const antGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.2, 4);

  const bodyMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.tint), transparent: true, opacity: 0.9 });
  const panelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.panelTint), transparent: true, opacity: 0.84, side: THREE.DoubleSide });
  const panelShimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#4488cc"), transparent: true, opacity: 0.0, side: THREE.DoubleSide });
  const diskMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#c8dcea"), transparent: true, opacity: 0.82 });
  const antMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#d8e8f4"), transparent: true, opacity: 0.7 });
  const glowMat = new THREE.SpriteMaterial({
    map: textures.glow,
    color: new THREE.Color("#60d8ff"),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.28
  });

  const body = new THREE.Mesh(bodyGeo, bodyMat);
  const leftPanel = new THREE.Mesh(panelGeo, panelMat);
  const rightPanel = new THREE.Mesh(panelGeo, panelMat);
  const leftShim = new THREE.Mesh(panelGeo, panelShimMat);
  const rightShim = new THREE.Mesh(panelGeo, panelShimMat);
  const disk = new THREE.Mesh(diskGeo, diskMat);
  const ant = new THREE.Mesh(antGeo, antMat);
  const glow = new THREE.Sprite(glowMat);

  leftPanel.position.x = -0.34;
  rightPanel.position.x = 0.34;
  leftShim.position.set(-0.34, 0, 0.001);
  rightShim.position.set(0.34, 0, 0.001);
  disk.position.set(0, 0, 0.06);
  disk.rotation.x = Math.PI * 0.5;
  ant.position.set(0.04, 0.14, 0);
  ant.rotation.z = 0.34;
  glow.scale.set(0.22, 0.22, 1);
  glow.position.z = 0.02;

  root.add(body, leftPanel, rightPanel, leftShim, rightShim, disk, ant, glow);
  root.visible = true;

  return {
    root,
    glow,
    leftShim,
    rightShim,
    materials: [bodyMat, panelMat, panelShimMat, diskMat, antMat, glowMat],
    geometries: [bodyGeo, panelGeo, diskGeo, antGeo],
    state: {
      cx: cfg.cx,
      cy: cfg.cy,
      radius: cfg.radius + randomBetween(-0.6, 0.6),
      speed: cfg.speed * randomBetween(0.88, 1.14),
      inc: cfg.inc + randomBetween(-0.08, 0.08),
      depth: cfg.depth,
      scale: cfg.scale,
      angle: randomBetween(0, Math.PI * 2),
      spinPhase: randomBetween(0, Math.PI * 2),
      pulseTimer: randomBetween(2, 8),
      pulseCooldown: randomBetween(5, 14),
    }
  };
}

export function createSatellites({ THREE, quality, textures }) {
  const group = new THREE.Group();
  const count = quality.name === "low" ? 0 : quality.name === "medium" ? 1 : 2;

  if (count === 0) {
    return { object3d: group, update: () => {}, destroy: () => {} };
  }

  const satellites = [];

  for (let i = 0; i < count; i++) {
    const sat = buildSatellite(THREE, textures, ORBIT_CONFIGS[i % ORBIT_CONFIGS.length]);
    sat.root.scale.setScalar(sat.state.scale);
    satellites.push(sat);
    group.add(sat.root);
  }

  function update(frame) {
    const warpStrength = frame.warp?.strength || 0;
    const lightingStrength = frame.lightingPulse?.strength || 0;

    group.position.x = (frame.camera?.driftX || 0) * 0.1;
    group.position.y = (frame.camera?.driftY || 0) * 0.07;

    for (let i = 0; i < satellites.length; i++) {
      const sat = satellites[i];
      const s = sat.state;

      s.angle += s.speed * frame.delta * quality.motionScale;

      const cosA = Math.cos(s.angle);
      const sinA = Math.sin(s.angle);
      const cosI = Math.cos(s.inc);
      const sinI = Math.sin(s.inc);

      sat.root.position.set(
        s.cx + s.radius * cosA,
        s.cy + s.radius * sinA * cosI,
        s.depth + s.radius * sinA * sinI * 0.42
      );

      const tangentX = -s.speed * sinA;
      const tangentY = s.speed * cosA * cosI;
      sat.root.rotation.z = Math.atan2(tangentY, tangentX);
      sat.root.rotation.x = Math.sin(frame.elapsed * 0.13 + s.spinPhase) * 0.11;
      sat.root.rotation.y = Math.cos(frame.elapsed * 0.1 + s.spinPhase) * 0.07;
      sat.root.scale.setScalar(s.scale * (1 - warpStrength * 0.28));

      const shimA = (Math.sin(frame.elapsed * 0.82 + s.angle * 1.8) + 1) * 0.5;
      sat.leftShim.material.opacity = shimA * 0.38 * (1 + lightingStrength * 0.28);
      sat.rightShim.material.opacity = (1 - shimA) * 0.38 * (1 + lightingStrength * 0.28);

      s.pulseTimer -= frame.delta;
      const pulseStrength = s.pulseTimer < 0.7 ? (0.7 - Math.max(0, s.pulseTimer)) / 0.7 : 0;
      if (s.pulseTimer <= 0) {
        s.pulseTimer = s.pulseCooldown + randomBetween(-2, 2);
      }
      sat.glow.material.opacity = (0.18 + pulseStrength * 0.46 + lightingStrength * 0.04) * (1 - warpStrength * 0.38);
    }
  }

  function destroy() {
    group.parent?.remove(group);
    for (const sat of satellites) {
      sat.materials.forEach(m => m.dispose());
      sat.geometries.forEach(g => g.dispose());
    }
  }

  return { object3d: group, update, destroy };
}
