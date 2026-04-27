import { pickQualityValue, randomBetween } from "./motion.js";

const DEFAULT_GALAXY_CORE_CONFIG = {
  galaxyRotationSpeed: 0.016,
  galaxySize: 0.94,
  particleDensity: 0.72,
  landscapePosition: [22.4, 7.6, -46],
  portraitPosition: [14.8, 9.2, -46],
  particleCount: {
    low: 0,
    medium: 40,
    high: 72
  },
  armCount: 3
};

function mergeGalaxyCoreConfig(overrides = {}) {
  return {
    ...DEFAULT_GALAXY_CORE_CONFIG,
    ...overrides,
    particleCount: {
      ...DEFAULT_GALAXY_CORE_CONFIG.particleCount,
      ...overrides.particleCount
    },
    landscapePosition: [...(overrides.landscapePosition || DEFAULT_GALAXY_CORE_CONFIG.landscapePosition)],
    portraitPosition: [...(overrides.portraitPosition || DEFAULT_GALAXY_CORE_CONFIG.portraitPosition)]
  };
}

export function createGalaxyCore({ THREE, quality, textures, viewport, config = {} }) {
  const galaxyConfig = mergeGalaxyCoreConfig(config);
  const particleCount = Math.max(
    0,
    Math.round(pickQualityValue(galaxyConfig.particleCount, quality.name) * galaxyConfig.particleDensity)
  );
  const group = new THREE.Group();
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(Math.max(1, particleCount) * 3);
  const colors = new Float32Array(Math.max(1, particleCount) * 3);
  const baseRadius = new Float32Array(Math.max(1, particleCount));
  const baseAngle = new Float32Array(Math.max(1, particleCount));
  const depth = new Float32Array(Math.max(1, particleCount));
  const phase = new Float32Array(Math.max(1, particleCount));
  const verticalOffset = new Float32Array(Math.max(1, particleCount));
  const orbitRate = new Float32Array(Math.max(1, particleCount));
  const radiusFlutter = new Float32Array(Math.max(1, particleCount));
  const verticalRate = new Float32Array(Math.max(1, particleCount));
  const depthRate = new Float32Array(Math.max(1, particleCount));
  const positionAttribute = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const pointsMaterial = new THREE.PointsMaterial({
    map: textures.star,
    alphaMap: textures.star,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.18 * quality.glowStrength,
    sizeAttenuation: true,
    size: quality.name === "high" ? 0.14 : 0.12
  });
  const points = new THREE.Points(geometry, pointsMaterial);
  const coreGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glow,
      color: new THREE.Color("#f7d9a3"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.12 * quality.glowStrength
    })
  );
  const outerVeil = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glow,
      color: new THREE.Color("#6aa8df"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.04 * quality.glowStrength
    })
  );
  const innerBloom = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glow,
      color: new THREE.Color("#ffe1a6"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.08 * quality.glowStrength
    })
  );
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glow,
      color: new THREE.Color("#72d7ff"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.07 * quality.glowStrength
    })
  );
  const dustHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glow,
      color: new THREE.Color("#5575b8"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.032 * quality.glowStrength
    })
  );
  let rotation = randomBetween(0, Math.PI * 2);
  let currentRotation = rotation;
  const basePosition = new THREE.Vector3();
  const driftPhaseX = randomBetween(0, Math.PI * 2);
  const driftPhaseY = randomBetween(0, Math.PI * 2);
  const glowPhase = randomBetween(0, Math.PI * 2);
  const smoothingRate = quality.name === "high" ? 0.76 : quality.name === "medium" ? 0.68 : 0.6;

  points.frustumCulled = false;
  points.renderOrder = -13;
  outerVeil.scale.set(27 * galaxyConfig.galaxySize, 14 * galaxyConfig.galaxySize, 1);
  outerVeil.position.set(0.8, -0.4, -0.16);
  innerBloom.scale.set(3.6 * galaxyConfig.galaxySize, 3.6 * galaxyConfig.galaxySize, 1);
  coreGlow.scale.set(6.4 * galaxyConfig.galaxySize, 6.4 * galaxyConfig.galaxySize, 1);
  halo.scale.set(13.2 * galaxyConfig.galaxySize, 13.2 * galaxyConfig.galaxySize, 1);
  dustHalo.scale.set(20.4 * galaxyConfig.galaxySize, 10.2 * galaxyConfig.galaxySize, 1);

  for (let index = 0; index < particleCount; index += 1) {
    const radial = Math.pow(Math.random(), 1.7) * 8.6 * galaxyConfig.galaxySize;
    const arm = index % galaxyConfig.armCount;
    const armOffset = (Math.PI * 2 * arm) / galaxyConfig.armCount;
    const jitter = randomBetween(-0.24, 0.24);
    const stride = index * 3;
    const warm = radial < 1.8 || index % 9 === 0;

    baseRadius[index] = radial;
    baseAngle[index] = armOffset + radial * 0.48 + jitter;
    depth[index] = randomBetween(-1.4, 1.4);
    phase[index] = randomBetween(0, Math.PI * 2);
    verticalOffset[index] = randomBetween(-0.16, 0.16);
    orbitRate[index] = randomBetween(0.92, 1.08);
    radiusFlutter[index] = randomBetween(0.008, 0.026);
    verticalRate[index] = randomBetween(0.014, 0.028);
    depthRate[index] = randomBetween(0.017, 0.031);
    colors[stride] = warm ? 0.92 : 0.56;
    colors[stride + 1] = warm ? 0.8 : 0.76;
    colors[stride + 2] = warm ? 0.58 : 0.96;
  }

  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  group.add(outerVeil, dustHalo, halo, points, coreGlow, innerBloom);

  function init(scene) {
    if (scene && group.parent !== scene) {
      scene.add(group);
    }
  }

  function resize(nextViewport = viewport) {
    const portrait = nextViewport.height > nextViewport.width;
    const anchor = portrait ? galaxyConfig.portraitPosition : galaxyConfig.landscapePosition;
    const compact = nextViewport.width < 900 || nextViewport.height < 720;
    const scaleFactor = compact ? 0.92 : 1;

    basePosition.set(anchor[0], anchor[1], anchor[2]);
    group.position.copy(basePosition);
    group.scale.setScalar(scaleFactor);
  }

  resize(viewport);

  function update(frame) {
    const lightingStrength = frame.lightingPulse?.strength || 0;
    const warpStrength = frame.warp?.strength || 0;
    const cameraDriftX = frame.camera?.driftX || 0;
    const cameraDriftY = frame.camera?.driftY || 0;
    const blackHole = frame.blackHole;
    const blackHolePull = blackHole?.pull || 0;
    const alpha = frame.delta > 0 ? Math.min(1, frame.delta * smoothingRate) : 1;

    rotation += frame.delta * galaxyConfig.galaxyRotationSpeed * quality.motionScale * (1 + blackHolePull * 0.16);
    currentRotation += (rotation - currentRotation) * alpha;
    group.rotation.z = currentRotation;
    group.position.x =
      basePosition.x +
      cameraDriftX * 0.06 +
      Math.sin(frame.elapsed * 0.012 + driftPhaseX) * 0.12 +
      Math.cos(frame.elapsed * 0.005 + driftPhaseY * 0.7) * 0.04 -
      blackHolePull * 0.12;
    group.position.y =
      basePosition.y +
      cameraDriftY * 0.045 +
      Math.cos(frame.elapsed * 0.01 + driftPhaseY) * 0.08 +
      Math.sin(frame.elapsed * 0.004 + driftPhaseX * 0.6) * 0.03 -
      blackHolePull * 0.03;
    coreGlow.material.opacity =
      0.1 * quality.glowStrength * (0.98 + lightingStrength * 0.16) * (1 - warpStrength * 0.06);
    outerVeil.material.opacity =
      0.034 * quality.glowStrength * (1 + lightingStrength * 0.1 + Math.sin(frame.elapsed * 0.01 + glowPhase * 0.4) * 0.06) *
      (1 - warpStrength * 0.08);
    innerBloom.material.opacity =
      0.066 * quality.glowStrength * (0.98 + lightingStrength * 0.14 + Math.sin(frame.elapsed * 0.018 + glowPhase * 0.6) * 0.08) *
      (1 - warpStrength * 0.05);
    halo.material.opacity =
      0.055 * quality.glowStrength * (0.99 + lightingStrength * 0.12) * (1 - warpStrength * 0.08);
    dustHalo.material.opacity =
      0.028 * quality.glowStrength * (0.96 + lightingStrength * 0.08) * (1 - warpStrength * 0.12);
    coreGlow.scale.setScalar(
      6.4 * galaxyConfig.galaxySize * (1 + Math.sin(frame.elapsed * 0.024 + glowPhase) * 0.012)
    );
    outerVeil.scale.set(
      27 * galaxyConfig.galaxySize * (1 + Math.sin(frame.elapsed * 0.008 + glowPhase * 0.3) * 0.018),
      14 * galaxyConfig.galaxySize * (1 + Math.cos(frame.elapsed * 0.007 + glowPhase * 0.5) * 0.014),
      1
    );
    outerVeil.position.x = 0.8 + Math.sin(frame.elapsed * 0.006 + driftPhaseX) * 0.22 - cameraDriftX * 0.03;
    outerVeil.position.y = -0.4 + Math.cos(frame.elapsed * 0.005 + driftPhaseY) * 0.14 - cameraDriftY * 0.02;
    innerBloom.scale.setScalar(
      3.6 * galaxyConfig.galaxySize * (1 + Math.cos(frame.elapsed * 0.02 + glowPhase * 0.5) * 0.018)
    );
    halo.scale.setScalar(
      13.2 * galaxyConfig.galaxySize * (1 + Math.cos(frame.elapsed * 0.014 + glowPhase * 0.8) * 0.01)
    );
    dustHalo.scale.set(
      20.4 * galaxyConfig.galaxySize * (1 + Math.sin(frame.elapsed * 0.008 + glowPhase * 0.4) * 0.012),
      10.2 * galaxyConfig.galaxySize * (1 + Math.cos(frame.elapsed * 0.006 + glowPhase * 0.6) * 0.014),
      1
    );
    pointsMaterial.opacity =
      0.15 * quality.glowStrength * (0.98 + lightingStrength * 0.1) * (1 - warpStrength * 0.1);

    for (let index = 0; index < particleCount; index += 1) {
      const stride = index * 3;
      const radialPulse =
        0.985 +
        Math.sin(frame.elapsed * verticalRate[index] + phase[index]) * radiusFlutter[index] +
        Math.cos(frame.elapsed * (depthRate[index] * 0.48) + phase[index] * 0.7) * radiusFlutter[index] * 0.46;
      const radius = baseRadius[index] * radialPulse;
      const angle =
        baseAngle[index] +
        currentRotation * orbitRate[index] +
        radius * 0.038 +
        Math.sin(frame.elapsed * 0.008 + phase[index]) * 0.026;

      positions[stride] = Math.cos(angle) * radius;
      positions[stride + 1] =
        Math.sin(angle) * radius * 0.42 +
        verticalOffset[index] +
        Math.sin(frame.elapsed * verticalRate[index] + phase[index]) * 0.028;
      positions[stride + 2] =
        depth[index] +
        Math.cos(frame.elapsed * depthRate[index] + phase[index]) * 0.055 -
        blackHolePull * 0.08;
    }

    positionAttribute.needsUpdate = true;
  }

  function destroy() {
    group.parent?.remove(group);
    geometry.dispose();
    pointsMaterial.dispose();
    outerVeil.material.dispose();
    coreGlow.material.dispose();
    innerBloom.material.dispose();
    halo.material.dispose();
    dustHalo.material.dispose();
  }

  return {
    config: galaxyConfig,
    destroy,
    init,
    object3d: group,
    resize,
    update
  };
}
