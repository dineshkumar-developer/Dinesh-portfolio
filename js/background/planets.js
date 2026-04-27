import { pickQualityValue } from "./motion.js";

const DEFAULT_PLANET_CONFIG = {
  energyFieldStrength: 0.26,
  energyPulseSpeed: 0.14,
  segments: {
    low: 20,
    medium: 28,
    high: 36
  },
  main: {
    radius: {
      low: 4.4,
      medium: 4.95,
      high: 5.6
    },
    landscapePosition: [15.6, -7.1, -21],
    portraitPosition: [13.1, -7.8, -21],
    tint: "#edf6ff",
    emissiveColor: "#1d4b76",
    emissiveIntensity: 0.08,
    atmosphereColor: "#67dbff",
    atmosphereOpacity: 0.22,
    atmosphereScale: 2.92,
    rimColor: "#8fdcff",
    rimOpacity: 0.15,
    rimScale: 3.12,
    hazeColor: "#8fdcff",
    hazeOpacity: 0.046,
    hazeScale: 4.3,
    energyFieldColor: "#8fe4ff",
    energyFieldOpacity: 0.068,
    energyFieldScale: 1.08,
    rotationSpeed: 0.028,
    orbitSpeed: 0.02,
    driftSpeed: 0.04,
    driftAmplitudeX: 0.28,
    driftAmplitudeY: 0.18,
    depthDrift: 0.24,
    orbitRadiusX: 0.58,
    orbitRadiusY: 0.22,
    axialTiltX: -0.2,
    axialTiltZ: -0.16,
    wobble: 0.016,
    cameraParallax: 0.18
  },
  secondary: {
    enabled: true,
    radius: {
      low: 1.8,
      medium: 2.25,
      high: 2.8
    },
    landscapePosition: [-13.8, 9.2, -33],
    portraitPosition: [-11.8, 10.1, -33],
    tint: "#e6ebff",
    emissiveColor: "#39467c",
    emissiveIntensity: 0.04,
    atmosphereColor: "#ffd79a",
    atmosphereOpacity: 0.12,
    atmosphereScale: 2.4,
    rimColor: "#ffe5af",
    rimOpacity: 0.08,
    rimScale: 2.74,
    hazeColor: "#ffe5af",
    hazeOpacity: 0.024,
    hazeScale: 3.84,
    energyFieldColor: "#ffe1a6",
    energyFieldOpacity: 0.044,
    energyFieldScale: 1.1,
    rotationSpeed: -0.015,
    orbitSpeed: 0.013,
    driftSpeed: 0.034,
    driftAmplitudeX: 0.16,
    driftAmplitudeY: 0.12,
    depthDrift: 0.16,
    orbitRadiusX: 0.32,
    orbitRadiusY: 0.14,
    axialTiltX: 0.26,
    axialTiltZ: 0.18,
    wobble: 0.01,
    cameraParallax: 0.1,
    opacity: 0.86
  }
};

function clonePosition(values) {
  return Array.isArray(values) ? [...values] : [0, 0, 0];
}

function mergePlanetConfig(overrides = {}) {
  return {
    ...DEFAULT_PLANET_CONFIG,
    ...overrides,
    segments: {
      ...DEFAULT_PLANET_CONFIG.segments,
      ...overrides.segments
    },
    main: {
      ...DEFAULT_PLANET_CONFIG.main,
      ...overrides.main,
      radius: {
        ...DEFAULT_PLANET_CONFIG.main.radius,
        ...overrides.main?.radius
      },
      landscapePosition: clonePosition(overrides.main?.landscapePosition || DEFAULT_PLANET_CONFIG.main.landscapePosition),
      portraitPosition: clonePosition(overrides.main?.portraitPosition || DEFAULT_PLANET_CONFIG.main.portraitPosition)
    },
    secondary: {
      ...DEFAULT_PLANET_CONFIG.secondary,
      ...overrides.secondary,
      radius: {
        ...DEFAULT_PLANET_CONFIG.secondary.radius,
        ...overrides.secondary?.radius
      },
      landscapePosition: clonePosition(overrides.secondary?.landscapePosition || DEFAULT_PLANET_CONFIG.secondary.landscapePosition),
      portraitPosition: clonePosition(overrides.secondary?.portraitPosition || DEFAULT_PLANET_CONFIG.secondary.portraitPosition)
    }
  };
}

function createPlanetDefinition(THREE, quality, definition, texture) {
  return {
    ...definition,
    radius: pickQualityValue(definition.radius, quality.name),
    position: new THREE.Vector3(...definition.landscapePosition),
    portraitPosition: new THREE.Vector3(...definition.portraitPosition),
    texture
  };
}

function createPlanetMesh(THREE, definition, textures, quality, segments) {
  const geometry = new THREE.SphereGeometry(definition.radius, segments, segments);
  const material = new THREE.MeshStandardMaterial({
    map: definition.texture,
    color: new THREE.Color(definition.tint),
    roughness: 0.97,
    metalness: 0,
    emissive: new THREE.Color(definition.emissiveColor),
    emissiveIntensity: definition.emissiveIntensity,
    transparent: true,
    opacity: definition.opacity ?? 1
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = definition.axialTiltX;
  mesh.rotation.z = definition.axialTiltZ;

  const atmosphereMaterial = new THREE.SpriteMaterial({
    map: textures.glow,
    color: new THREE.Color(definition.atmosphereColor),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: definition.atmosphereOpacity * quality.glowStrength
  });
  const atmosphere = new THREE.Sprite(atmosphereMaterial);
  const atmosphereScale = definition.radius * definition.atmosphereScale;
  atmosphere.scale.set(atmosphereScale, atmosphereScale, 1);

  const rimMaterial = new THREE.SpriteMaterial({
    map: textures.glow,
    color: new THREE.Color(definition.rimColor),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: definition.rimOpacity * quality.glowStrength
  });
  const rim = new THREE.Sprite(rimMaterial);
  const rimScale = definition.radius * definition.rimScale;
  rim.scale.set(rimScale, rimScale, 1);

  const hazeMaterial = new THREE.SpriteMaterial({
    map: textures.glow,
    color: new THREE.Color(definition.hazeColor),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: definition.hazeOpacity * quality.glowStrength
  });
  const haze = new THREE.Sprite(hazeMaterial);
  const hazeScale = definition.radius * definition.hazeScale;
  haze.scale.set(hazeScale, hazeScale, 1);
  haze.position.z = -0.22;

  const backGlowMaterial = new THREE.SpriteMaterial({
    map: textures.glow,
    color: new THREE.Color(definition.atmosphereColor),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: definition.atmosphereOpacity * quality.glowStrength * 0.34
  });
  const backGlow = new THREE.Sprite(backGlowMaterial);
  const backGlowScale = definition.radius * (definition.hazeScale + 0.9);
  backGlow.scale.set(backGlowScale, backGlowScale, 1);
  backGlow.position.z = -0.34;

  const shimmerMaterial = new THREE.SpriteMaterial({
    map: textures.glow,
    color: new THREE.Color(definition.rimColor),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: definition.rimOpacity * quality.glowStrength * 0.42
  });
  const shimmer = new THREE.Sprite(shimmerMaterial);
  const shimmerScale = definition.radius * (definition.rimScale * 0.76);
  shimmer.scale.set(shimmerScale, shimmerScale * 0.76, 1);
  shimmer.position.z = 0.16;

  const energyGeometry = new THREE.SphereGeometry(definition.radius * definition.energyFieldScale, segments, segments);
  const energyMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(definition.energyFieldColor),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: definition.energyFieldOpacity * quality.glowStrength,
    side: THREE.BackSide
  });
  const energyField = new THREE.Mesh(energyGeometry, energyMaterial);

  const group = new THREE.Group();
  group.position.copy(definition.position);
  group.add(backGlow, haze, energyField, mesh, atmosphere, rim, shimmer);

  return {
    group,
    mesh,
    atmosphere,
    rim,
    haze,
    backGlow,
    shimmer,
    energyField,
    geometry,
    energyGeometry,
    material,
    atmosphereMaterial,
    rimMaterial,
    hazeMaterial,
    backGlowMaterial,
    shimmerMaterial,
    energyMaterial,
    radius: definition.radius,
    anchor: definition.position.clone(),
    landscapeAnchor: definition.position.clone(),
    portraitAnchor: definition.portraitPosition.clone(),
    orbitRadiusX: definition.orbitRadiusX,
    orbitRadiusY: definition.orbitRadiusY,
    orbitSpeed: definition.orbitSpeed,
    driftSpeed: definition.driftSpeed,
    driftAmplitudeX: definition.driftAmplitudeX,
    driftAmplitudeY: definition.driftAmplitudeY,
    depthDrift: definition.depthDrift,
    rotationSpeed: definition.rotationSpeed,
    baseTiltX: definition.axialTiltX,
    baseTiltZ: definition.axialTiltZ,
    wobble: definition.wobble,
    cameraParallax: definition.cameraParallax || 0,
    baseEmissiveIntensity: definition.emissiveIntensity,
    baseColor: new THREE.Color(definition.tint),
    baseEmissiveColor: new THREE.Color(definition.emissiveColor),
    baseAtmosphereOpacity: atmosphereMaterial.opacity,
    baseRimOpacity: rimMaterial.opacity,
    baseHazeOpacity: hazeMaterial.opacity,
    baseBackGlowOpacity: backGlowMaterial.opacity,
    baseShimmerOpacity: shimmerMaterial.opacity,
    baseHazeScale: hazeScale,
    baseBackGlowScale: backGlowScale,
    baseShimmerScale: shimmerScale,
    baseEnergyOpacity: energyMaterial.opacity,
    hazePhase: Math.random() * Math.PI * 2
  };
}

export function getPlanetConfig(overrides = {}) {
  return mergePlanetConfig(overrides);
}

export function createPlanets({ THREE, quality, textures, viewport, config = {} }) {
  const group = new THREE.Group();
  const planetConfig = mergePlanetConfig(config);
  const segments = pickQualityValue(planetConfig.segments, quality.name);
  const instances = [];
  const blackHoleOffset = new THREE.Vector2();

  const mainPlanet = createPlanetMesh(
    THREE,
    createPlanetDefinition(THREE, quality, planetConfig.main, textures.primaryPlanet),
    textures,
    quality,
    segments
  );
  instances.push(mainPlanet);

  if (quality.secondaryPlanet !== false && planetConfig.secondary.enabled !== false) {
    const secondaryPlanet = createPlanetMesh(
      THREE,
      createPlanetDefinition(THREE, quality, planetConfig.secondary, textures.secondaryPlanet),
      textures,
      quality,
      Math.max(16, Math.floor(segments * 0.88))
    );
    instances.push(secondaryPlanet);
  }

  for (let index = 0; index < instances.length; index += 1) {
    group.add(instances[index].group);
  }

  function init(scene) {
    if (scene && group.parent !== scene) {
      scene.add(group);
    }
  }

  function resize(nextViewport = viewport) {
    const landscape = nextViewport.width >= nextViewport.height;

    for (let index = 0; index < instances.length; index += 1) {
      const planet = instances[index];
      planet.anchor.copy(landscape ? planet.landscapeAnchor : planet.portraitAnchor);
      planet.group.position.copy(planet.anchor);
    }
  }

  resize(viewport);

  function update(frame) {
    const pulseStrength = frame.lightingPulse?.strength || 0;
    const emissiveBoost = frame.lightingPulse?.emissiveBoost || 1;
    const cameraDriftX = frame.camera?.driftX || 0;
    const cameraDriftY = frame.camera?.driftY || 0;
    const warpStrength = frame.warp?.strength || 0;
    const blackHole = frame.blackHole;
    const blackHolePull = blackHole?.pull || 0;

    for (let index = 0; index < instances.length; index += 1) {
      const planet = instances[index];
      const offset = index * 0.95;
      const orbitAngle = frame.elapsed * planet.orbitSpeed + offset;
      const driftAngle = frame.elapsed * planet.driftSpeed + offset * 1.4;
      const energyPulse = Math.sin(frame.elapsed * planetConfig.energyPulseSpeed + offset) * 0.5 + 0.5;
      const heroPulse = Math.cos(frame.elapsed * 0.024 + planet.hazePhase) * 0.5 + 0.5;
      const colorPulse = Math.sin(frame.elapsed * 0.014 + planet.hazePhase * 0.72) * 0.5 + 0.5;

      if (blackHole?.strength > 0.01) {
        const strength = blackHolePull * (index === 0 ? 0.46 : 0.22);
        blackHoleOffset.set(
          (blackHole.position.x - planet.anchor.x) * strength * 0.04,
          (blackHole.position.y - planet.anchor.y) * strength * 0.026
        );
      } else {
        blackHoleOffset.set(0, 0);
      }

      planet.mesh.rotation.y += frame.delta * planet.rotationSpeed * (1 + warpStrength * 0.04);
      planet.mesh.rotation.x = planet.baseTiltX + Math.sin(frame.elapsed * 0.038 + offset) * planet.wobble;
      planet.mesh.rotation.z = planet.baseTiltZ + Math.cos(frame.elapsed * 0.03 + offset) * planet.wobble * 0.8;

      planet.group.position.x =
        planet.anchor.x +
        Math.cos(orbitAngle) * planet.orbitRadiusX +
        Math.sin(driftAngle) * planet.driftAmplitudeX +
        cameraDriftX * planet.cameraParallax +
        blackHoleOffset.x;
      planet.group.position.y =
        planet.anchor.y +
        Math.sin(orbitAngle) * planet.orbitRadiusY +
        Math.cos(driftAngle * 0.82) * planet.driftAmplitudeY +
        cameraDriftY * planet.cameraParallax * 0.66 +
        blackHoleOffset.y;
      planet.group.position.z =
        planet.anchor.z +
        Math.sin(driftAngle * 0.55) * planet.depthDrift -
        warpStrength * 0.12 * (index === 0 ? 1 : 0.6);

      planet.material.emissiveIntensity =
        planet.baseEmissiveIntensity * emissiveBoost * (1.02 + pulseStrength * 0.16);
      planet.material.color.copy(planet.baseColor);
      planet.material.color.offsetHSL(0, 0.02 + colorPulse * 0.008, pulseStrength * 0.012 + colorPulse * 0.014);
      planet.material.emissive.copy(planet.baseEmissiveColor);
      planet.material.emissive.offsetHSL(0, 0.02, pulseStrength * 0.035 + heroPulse * 0.02);
      planet.atmosphere.material.opacity =
        planet.baseAtmosphereOpacity *
        (1.02 + Math.sin(frame.elapsed * 0.044 + offset) * 0.04 + pulseStrength * 0.12) *
        (1 - warpStrength * 0.08) *
        (1 + blackHolePull * 0.12);
      planet.rim.material.opacity =
        planet.baseRimOpacity *
        (1 + Math.cos(frame.elapsed * 0.04 + offset) * 0.048 + pulseStrength * 0.14) *
        (1 - warpStrength * 0.04) *
        (1 + blackHolePull * 0.1);
      planet.haze.material.opacity =
        planet.baseHazeOpacity *
        (0.94 + heroPulse * 0.24 + pulseStrength * 0.16) *
        (1 - warpStrength * 0.1);
      planet.backGlow.material.opacity =
        planet.baseBackGlowOpacity * (0.94 + heroPulse * 0.2 + pulseStrength * 0.14 + blackHolePull * 0.08) * (1 - warpStrength * 0.08);
      planet.haze.scale.setScalar(
        planet.baseHazeScale *
        (1 + heroPulse * 0.032 + pulseStrength * 0.06)
      );
      planet.backGlow.scale.setScalar(
        planet.baseBackGlowScale *
        (1 + heroPulse * 0.026 + pulseStrength * 0.05)
      );
      planet.shimmer.material.opacity =
        planet.baseShimmerOpacity *
        (0.98 + heroPulse * 0.22 + pulseStrength * 0.18) *
        (1 - warpStrength * 0.08);
      planet.shimmer.scale.set(
        planet.baseShimmerScale * (1 + heroPulse * 0.028 + pulseStrength * 0.05),
        planet.baseShimmerScale * 0.76 * (1 + heroPulse * 0.018 + pulseStrength * 0.035),
        1
      );
      planet.haze.position.x = cameraDriftX * planet.cameraParallax * 0.06 - blackHoleOffset.x * 0.08;
      planet.haze.position.y = cameraDriftY * planet.cameraParallax * 0.04 - blackHoleOffset.y * 0.08;
      planet.backGlow.position.x = -cameraDriftX * planet.cameraParallax * 0.1 - blackHoleOffset.x * 0.04;
      planet.backGlow.position.y = -cameraDriftY * planet.cameraParallax * 0.06 - blackHoleOffset.y * 0.04;
      planet.shimmer.position.x =
        planet.radius * 0.12 +
        cameraDriftX * planet.cameraParallax * 0.18 +
        pulseStrength * 0.08 -
        blackHoleOffset.x * 0.04;
      planet.shimmer.position.y =
        planet.radius * 0.04 +
        cameraDriftY * planet.cameraParallax * 0.1 +
        heroPulse * 0.06 -
        blackHoleOffset.y * 0.04;
      planet.energyField.scale.setScalar(1 + energyPulse * 0.022 + pulseStrength * 0.016 + blackHolePull * 0.05);
      planet.energyMaterial.opacity =
        planet.baseEnergyOpacity *
        planetConfig.energyFieldStrength *
        (0.94 + energyPulse * 0.14 + pulseStrength * 0.22) *
        (1 - warpStrength * 0.06);
    }
  }

  function destroy() {
    group.parent?.remove(group);

    for (let index = 0; index < instances.length; index += 1) {
      const planet = instances[index];
      planet.geometry.dispose();
      planet.energyGeometry.dispose();
      planet.material.dispose();
      planet.atmosphereMaterial.dispose();
      planet.rimMaterial.dispose();
      planet.hazeMaterial.dispose();
      planet.backGlowMaterial.dispose();
      planet.shimmerMaterial.dispose();
      planet.energyMaterial.dispose();
    }
  }

  return {
    config: planetConfig,
    destroy,
    init,
    object3d: group,
    resize,
    update
  };
}
