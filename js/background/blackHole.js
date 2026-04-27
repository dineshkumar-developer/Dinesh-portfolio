import { blend, pickQualityValue, randomBetween } from "./motion.js";

const DEFAULT_BLACK_HOLE_CONFIG = {
  blackHoleStrength: 0.46,
  particleDensity: 0.8,
  landscapePosition: [-18.4, 8.2, -38],
  portraitPosition: [-13.6, 9.4, -38],
  influenceRadius: 10.5,
  coreRadius: {
    low: 1.6,
    medium: 2.1,
    high: 2.6
  },
  diskInnerScale: 1.36,
  diskOuterScale: 2.68,
  ringGlowScale: 3.1,
  diskRotationSpeed: 0.13,
  spiralSpeed: 0.5,
  particleCount: {
    low: 10,
    medium: 16,
    high: 26
  }
};

function createCanvasTexture(THREE, width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  draw(context, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createRingTexture(THREE) {
  return createCanvasTexture(THREE, 768, 768, (context, width, height) => {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const outer = width * 0.44;
    const inner = width * 0.18;

    context.clearRect(0, 0, width, height);
    context.translate(cx, cy);

    for (let index = 0; index < 18; index += 1) {
      const start = Math.PI * 2 * (index / 18) + Math.sin(index * 1.4) * 0.1;
      const end = start + randomBetween(0.22, 0.52);
      const gradient = context.createRadialGradient(0, 0, inner, 0, 0, outer);

      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(0.45, index % 3 === 0 ? "rgba(255,168,104,0.08)" : "rgba(125,226,255,0.05)");
      gradient.addColorStop(0.72, index % 2 === 0 ? "rgba(255,214,128,0.24)" : "rgba(104,208,255,0.18)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");

      context.strokeStyle = gradient;
      context.lineWidth = randomBetween(18, 34);
      context.beginPath();
      context.arc(0, 0, outer - randomBetween(24, 54), start, end);
      context.stroke();
    }
  });
}

function createShadowTexture(THREE) {
  return createCanvasTexture(THREE, 512, 512, (context, width, height) => {
    const gradient = context.createRadialGradient(
      width * 0.5,
      height * 0.5,
      width * 0.04,
      width * 0.5,
      height * 0.5,
      width * 0.5
    );

    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(0.52, "rgba(0,0,0,0.94)");
    gradient.addColorStop(0.72, "rgba(6,10,19,0.52)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  });
}

function mergeBlackHoleConfig(overrides = {}) {
  return {
    ...DEFAULT_BLACK_HOLE_CONFIG,
    ...overrides,
    coreRadius: {
      ...DEFAULT_BLACK_HOLE_CONFIG.coreRadius,
      ...overrides.coreRadius
    },
    particleCount: {
      ...DEFAULT_BLACK_HOLE_CONFIG.particleCount,
      ...overrides.particleCount
    },
    landscapePosition: [...(overrides.landscapePosition || DEFAULT_BLACK_HOLE_CONFIG.landscapePosition)],
    portraitPosition: [...(overrides.portraitPosition || DEFAULT_BLACK_HOLE_CONFIG.portraitPosition)]
  };
}

function respawnSwirlParticle(angles, radii, spiralSpeed, verticalPhase, verticalRange, index, innerRadius, outerRadius) {
  angles[index] = randomBetween(0, Math.PI * 2);
  radii[index] = randomBetween(innerRadius * 1.08, outerRadius);
  verticalPhase[index] = randomBetween(0, Math.PI * 2);
  verticalRange[index] = randomBetween(0.08, 0.34);
  spiralSpeed[index] = randomBetween(0.28, 0.64);
}

export function createBlackHole({ THREE, quality, textures, viewport, config = {} }) {
  const blackHoleConfig = mergeBlackHoleConfig(config);
  const group = new THREE.Group();
  const tiltGroup = new THREE.Group();
  const ringTexture = createRingTexture(THREE);
  const shadowTexture = createShadowTexture(THREE);
  const coreRadius = pickQualityValue(blackHoleConfig.coreRadius, quality.name);
  const particleCount = Math.max(
    6,
    Math.round(pickQualityValue(blackHoleConfig.particleCount, quality.name) * blackHoleConfig.particleDensity)
  );
  const innerRadius = coreRadius * blackHoleConfig.diskInnerScale;
  const outerRadius = coreRadius * blackHoleConfig.diskOuterScale;
  const shadow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.72
    })
  );
  const horizonGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glow,
      color: new THREE.Color("#4fc7ff"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.032 * quality.glowStrength
    })
  );
  const accretionGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glow,
      color: new THREE.Color("#ffcc8b"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.04 * quality.glowStrength
    })
  );
  const core = new THREE.Mesh(
    new THREE.CircleGeometry(coreRadius, 48),
    new THREE.MeshBasicMaterial({
      color: 0x010206,
      transparent: true,
      opacity: 0.96
    })
  );
  const outerCore = new THREE.Mesh(
    new THREE.CircleGeometry(coreRadius * 1.1, 40),
    new THREE.MeshBasicMaterial({
      color: 0x05070d,
      transparent: true,
      opacity: 0.34
    })
  );
  const diskMaterial = new THREE.MeshBasicMaterial({
    map: ringTexture,
    color: new THREE.Color("#ffca8d"),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.46 * quality.glowStrength,
    side: THREE.DoubleSide
  });
  const disk = new THREE.Mesh(new THREE.RingGeometry(innerRadius, outerRadius, 80, 1), diskMaterial);
  const secondaryDiskMaterial = new THREE.MeshBasicMaterial({
    map: ringTexture,
    color: new THREE.Color("#72d5ff"),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.22 * quality.glowStrength,
    side: THREE.DoubleSide
  });
  const secondaryDisk = new THREE.Mesh(
    new THREE.RingGeometry(innerRadius * 0.92, outerRadius * 1.08, 80, 1),
    secondaryDiskMaterial
  );
  const ringGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glow,
      color: new THREE.Color("#6fd8ff"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.13 * quality.glowStrength
    })
  );

  shadow.scale.set(coreRadius * 6.4, coreRadius * 6.4, 1);
  shadow.position.z = -0.1;
  horizonGlow.scale.set(coreRadius * 14.2, coreRadius * 8.4, 1);
  horizonGlow.position.z = -0.18;
  accretionGlow.scale.set(coreRadius * 9.8, coreRadius * 4.8, 1);
  accretionGlow.position.set(coreRadius * 0.18, -coreRadius * 0.06, -0.12);
  accretionGlow.material.rotation = -0.26;
  core.position.z = 0.08;
  outerCore.position.z = 0.04;
  ringGlow.scale.set(coreRadius * blackHoleConfig.ringGlowScale, coreRadius * blackHoleConfig.ringGlowScale, 1);
  disk.rotation.x = 1.2;
  secondaryDisk.rotation.x = 1.22;
  secondaryDisk.rotation.z = Math.PI * 0.18;
  tiltGroup.rotation.z = -0.16;
  tiltGroup.add(disk, secondaryDisk, ringGlow);
  group.add(horizonGlow, accretionGlow, shadow, tiltGroup, outerCore, core);

  const swirlGeometry = new THREE.BufferGeometry();
  const swirlPositions = new Float32Array(particleCount * 3);
  const swirlColors = new Float32Array(particleCount * 3);
  const angles = new Float32Array(particleCount);
  const radii = new Float32Array(particleCount);
  const spiralSpeed = new Float32Array(particleCount);
  const verticalPhase = new Float32Array(particleCount);
  const verticalRange = new Float32Array(particleCount);
  const swirlPositionAttribute = new THREE.BufferAttribute(swirlPositions, 3).setUsage(THREE.DynamicDrawUsage);

  for (let index = 0; index < particleCount; index += 1) {
    respawnSwirlParticle(angles, radii, spiralSpeed, verticalPhase, verticalRange, index, innerRadius, outerRadius * 1.12);
    const stride = index * 3;
    const warm = index % 4 === 0;

    swirlColors[stride] = warm ? 1 : 0.46;
    swirlColors[stride + 1] = warm ? 0.78 : 0.82;
    swirlColors[stride + 2] = warm ? 0.48 : 1;
  }

  swirlGeometry.setAttribute("position", swirlPositionAttribute);
  swirlGeometry.setAttribute("color", new THREE.BufferAttribute(swirlColors, 3));

  const swirlMaterial = new THREE.PointsMaterial({
    map: textures.star,
    alphaMap: textures.star,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.22 * quality.glowStrength,
    sizeAttenuation: true,
    size: quality.name === "high" ? 0.12 : 0.1
  });
  const swirl = new THREE.Points(swirlGeometry, swirlMaterial);
  swirl.frustumCulled = false;
  group.add(swirl);

  const tiltPhase = randomBetween(0, Math.PI * 2);
  const glowPhase = randomBetween(0, Math.PI * 2);
  const accretionPhase = randomBetween(0, Math.PI * 2);
  const corePhase = randomBetween(0, Math.PI * 2);
  const shadowPhase = randomBetween(0, Math.PI * 2);
  const driftPhaseX = randomBetween(0, Math.PI * 2);
  const driftPhaseY = randomBetween(0, Math.PI * 2);
  const basePosition = new THREE.Vector3();
  const state = {
    position: group.position,
    influenceRadius: blackHoleConfig.influenceRadius,
    strength: blackHoleConfig.blackHoleStrength,
    pull: blackHoleConfig.blackHoleStrength * 0.22
  };

  function resize(nextViewport = viewport) {
    const portrait = nextViewport.height > nextViewport.width;
    const anchor = portrait ? blackHoleConfig.portraitPosition : blackHoleConfig.landscapePosition;

    basePosition.set(anchor[0], anchor[1], anchor[2]);
    group.position.copy(basePosition);
  }

  resize(viewport);

  function init(scene) {
    if (scene && group.parent !== scene) {
      scene.add(group);
    }
  }

  function update(frame) {
    const lightingStrength = frame.lightingPulse?.strength || 0;
    const warpStrength = frame.warp?.strength || 0;
    const cameraDriftX = frame.camera?.driftX || 0;
    const cameraDriftY = frame.camera?.driftY || 0;
    const motion = quality.motionScale * (0.84 + warpStrength * 0.2);
    const activity = blackHoleConfig.blackHoleStrength * (0.92 + lightingStrength * 0.12);
    const smoothing = Math.min(1, frame.delta * 0.74);

    group.position.x =
      basePosition.x +
      cameraDriftX * 0.08 +
      Math.sin(frame.elapsed * 0.01 + driftPhaseX) * 0.16;
    group.position.y =
      basePosition.y +
      cameraDriftY * 0.05 +
      Math.cos(frame.elapsed * 0.008 + driftPhaseY) * 0.08;

    disk.rotation.z += frame.delta * blackHoleConfig.diskRotationSpeed * motion;
    secondaryDisk.rotation.z -= frame.delta * blackHoleConfig.diskRotationSpeed * 0.62 * motion;
    tiltGroup.rotation.z =
      -0.16 +
      Math.sin(frame.elapsed * 0.013 + tiltPhase) * 0.008 +
      Math.cos(frame.elapsed * 0.005 + tiltPhase * 0.7) * 0.003;
    shadow.material.opacity = blend(
      shadow.material.opacity,
      0.48 + lightingStrength * 0.026 + Math.sin(frame.elapsed * 0.01 + shadowPhase) * 0.012,
      smoothing
    );
    horizonGlow.material.opacity = blend(
      horizonGlow.material.opacity,
      0.028 * quality.glowStrength * (1 + lightingStrength * 0.22 + warpStrength * 0.12),
      smoothing
    );
    accretionGlow.material.opacity = blend(
      accretionGlow.material.opacity,
      0.05 * quality.glowStrength * (1 + lightingStrength * 0.18 + Math.sin(frame.elapsed * 0.018 + accretionPhase) * 0.08),
      smoothing
    );
    ringGlow.material.opacity = blend(
      ringGlow.material.opacity,
      0.052 * quality.glowStrength * (0.98 + lightingStrength * 0.16 + Math.sin(frame.elapsed * 0.009 + glowPhase) * 0.05),
      smoothing
    );
    disk.material.opacity = blend(
      disk.material.opacity,
      0.22 * quality.glowStrength * (1 + lightingStrength * 0.12),
      smoothing
    );
    secondaryDisk.material.opacity = blend(
      secondaryDisk.material.opacity,
      0.1 * quality.glowStrength * (0.99 + lightingStrength * 0.1),
      smoothing
    );
    core.scale.setScalar(1 + Math.sin(frame.elapsed * 0.022 + corePhase) * 0.004);
    accretionGlow.scale.set(
      coreRadius * 9.8 * (1 + Math.sin(frame.elapsed * 0.015 + accretionPhase) * 0.018),
      coreRadius * 4.8 * (1 + Math.cos(frame.elapsed * 0.012 + accretionPhase * 0.7) * 0.014),
      1
    );
    accretionGlow.position.x =
      coreRadius * 0.18 +
      Math.sin(frame.elapsed * 0.014 + glowPhase) * 0.08 +
      cameraDriftX * 0.02;
    accretionGlow.position.y =
      -coreRadius * 0.06 +
      Math.cos(frame.elapsed * 0.012 + glowPhase * 0.8) * 0.04 +
      cameraDriftY * 0.015;
    outerCore.material.opacity = blend(
      outerCore.material.opacity,
      0.24 + Math.sin(frame.elapsed * 0.015 + corePhase * 0.8) * 0.01,
      smoothing
    );

    state.strength = blend(
      state.strength,
      blackHoleConfig.blackHoleStrength * (0.96 + lightingStrength * 0.08),
      smoothing
    );
    state.pull = blend(
      state.pull,
      blackHoleConfig.blackHoleStrength * (0.11 + lightingStrength * 0.02 + warpStrength * 0.015),
      smoothing
    );
    state.influenceRadius = blend(
      state.influenceRadius,
      blackHoleConfig.influenceRadius * (1 + lightingStrength * 0.03),
      smoothing
    );

    for (let index = 0; index < particleCount; index += 1) {
      const stride = index * 3;

      angles[index] += frame.delta * (spiralSpeed[index] + blackHoleConfig.spiralSpeed * 0.2) * motion;
      radii[index] -= frame.delta * (blackHoleConfig.spiralSpeed + spiralSpeed[index] * 0.24) * (0.26 + activity * 0.1);

      if (radii[index] <= innerRadius * 1.08) {
        respawnSwirlParticle(angles, radii, spiralSpeed, verticalPhase, verticalRange, index, innerRadius, outerRadius * 1.14);
      }

      const x = Math.cos(angles[index]) * radii[index];
      const y = Math.sin(angles[index]) * radii[index] * 0.42;
      const z = Math.sin(frame.elapsed * 0.14 + verticalPhase[index]) * verticalRange[index] * 0.78;

      swirlPositions[stride] = x;
      swirlPositions[stride + 1] = y;
      swirlPositions[stride + 2] = z;
    }

    swirlPositionAttribute.needsUpdate = true;
  }

  function destroy() {
    group.parent?.remove(group);
    shadowTexture.dispose();
    ringTexture.dispose();
    shadow.material.dispose();
    horizonGlow.material.dispose();
    accretionGlow.material.dispose();
    core.geometry.dispose();
    core.material.dispose();
    outerCore.geometry.dispose();
    outerCore.material.dispose();
    disk.geometry.dispose();
    disk.material.dispose();
    secondaryDisk.geometry.dispose();
    secondaryDisk.material.dispose();
    ringGlow.material.dispose();
    swirlGeometry.dispose();
    swirlMaterial.dispose();
  }

  return {
    destroy,
    getState: () => state,
    init,
    object3d: group,
    resize,
    update
  };
}
