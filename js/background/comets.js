import { pickDifferent, pickOne, randomBetween, randomSign } from "./motion.js";

const COMET_ROUTE_FAMILIES = [
  "left-rising",
  "left-falling",
  "right-rising",
  "right-falling",
  "top-diagonal-left",
  "top-diagonal-right",
  "center-skimming-left",
  "center-skimming-right"
];

const DEFAULT_COMET_CONFIG = {
  trailIntensity: 1,
  haloIntensity: 1,
  curveStrength: 1,
  depthDriftStrength: 1,
  blackHoleInfluence: 0.16,
  speedScale: 1,
  scaleRange: {
    min: 0.72,
    max: 1.08
  }
};

function mergeCometConfig(overrides = {}) {
  return {
    ...DEFAULT_COMET_CONFIG,
    ...overrides,
    scaleRange: {
      ...DEFAULT_COMET_CONFIG.scaleRange,
      ...overrides.scaleRange
    }
  };
}

function buildComet(THREE, textures, shared) {
  const root = new THREE.Group();
  const tailMaterial = new THREE.MeshBasicMaterial({
    map: textures.cometTail,
    color: new THREE.Color("#84d8ff"),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0
  });
  const tail = new THREE.Mesh(shared.tailGeometry, tailMaterial);
  const headMaterial = new THREE.SpriteMaterial({
    map: textures.glow,
    color: new THREE.Color("#eff8ff"),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0
  });
  const head = new THREE.Sprite(headMaterial);
  const haloMaterial = new THREE.SpriteMaterial({
    map: textures.glow,
    color: new THREE.Color("#8edcff"),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0
  });
  const halo = new THREE.Sprite(haloMaterial);

  tail.position.x = -0.9;
  tail.scale.set(1.8, 0.12, 1);
  head.scale.set(0.42, 0.42, 1);
  halo.scale.set(0.86, 0.86, 1);
  root.visible = false;
  root.add(tail, halo, head);

  return {
    root,
    tail,
    head,
    halo,
    materials: [tailMaterial, headMaterial, haloMaterial],
    state: {
      active: false,
      elapsed: 0,
      life: 1,
      scale: 1,
      origin: new THREE.Vector3(),
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      lateralAxis: new THREE.Vector3(),
      forwardDistance: 0,
      speed: 0,
      curveAmplitude: 0,
      curveFrequency: 0,
      curvePhase: 0,
      depthAmplitude: 0,
      depthFrequency: 0,
      depthPhase: 0,
      glowBias: 1,
      tailScaleX: 1
    }
  };
}

function createRoute(previousRouteKey = "") {
  const routeKey = pickDifferent(COMET_ROUTE_FAMILIES, previousRouteKey);
  const zStart = randomBetween(-24, -15);
  const zEnd = zStart + randomBetween(0.4, 1.4) * randomSign();

  switch (routeKey) {
    case "left-falling":
      return {
        key: routeKey,
        start: { x: -40, y: randomBetween(4.8, 10.4), z: zStart },
        end: { x: 40, y: randomBetween(-9.4, -3.2), z: zEnd }
      };
    case "right-rising":
      return {
        key: routeKey,
        start: { x: 40, y: randomBetween(-10, -4.8), z: zStart },
        end: { x: -40, y: randomBetween(3.2, 9), z: zEnd }
      };
    case "right-falling":
      return {
        key: routeKey,
        start: { x: 40, y: randomBetween(4.4, 10.2), z: zStart },
        end: { x: -40, y: randomBetween(-9.6, -3.8), z: zEnd }
      };
    case "top-diagonal-left":
      return {
        key: routeKey,
        start: { x: randomBetween(10, 22), y: 15, z: zStart },
        end: { x: randomBetween(-34, -20), y: -13, z: zEnd }
      };
    case "top-diagonal-right":
      return {
        key: routeKey,
        start: { x: randomBetween(-22, -10), y: 15, z: zStart },
        end: { x: randomBetween(20, 34), y: -13, z: zEnd }
      };
    case "center-skimming-left":
      return {
        key: routeKey,
        start: { x: 40, y: randomBetween(-2.4, 2.4), z: zStart },
        end: { x: -40, y: randomBetween(-3.2, 3.2), z: zEnd }
      };
    case "center-skimming-right":
      return {
        key: routeKey,
        start: { x: -40, y: randomBetween(-2.4, 2.4), z: zStart },
        end: { x: 40, y: randomBetween(-3.2, 3.2), z: zEnd }
      };
    default:
      return {
        key: routeKey,
        start: { x: -40, y: randomBetween(-10, -4), z: zStart },
        end: { x: 40, y: randomBetween(3.6, 9.4), z: zEnd }
      };
  }
}

export function createComets({ THREE, quality, textures, config = {} }) {
  const cometConfig = mergeCometConfig(config);
  const group = new THREE.Group();
  const shared = {
    tailGeometry: new THREE.PlaneGeometry(3.2, 0.12)
  };
  const comets = [];
  const tempDirection = new THREE.Vector3();
  const tempLateral = new THREE.Vector3();
  const tempTangent = new THREE.Vector3();
  const tempBlackHoleDirection = new THREE.Vector3();
  const cometPalette = ["#7cd4ff", "#a0e7ff", "#c3e1ff", "#8ec9ff"];
  let lastRouteKey = "";
  let activeCount = 0;

  for (let index = 0; index < quality.cometPoolSize; index += 1) {
    const comet = buildComet(THREE, textures, shared);
    comets.push(comet);
    group.add(comet.root);
  }

  function acquireInactive() {
    for (let index = 0; index < comets.length; index += 1) {
      if (!comets[index].state.active) {
        return comets[index];
      }
    }

    return null;
  }

  function resetComet(comet) {
    if (!comet.state.active) {
      return;
    }

    comet.state.active = false;
    activeCount = Math.max(0, activeCount - 1);
    comet.root.visible = false;
    comet.tail.material.opacity = 0;
    comet.head.material.opacity = 0;
    comet.halo.material.opacity = 0;
  }

  function spawn() {
    const comet = acquireInactive();

    if (!comet) {
      return false;
    }

    const route = createRoute(lastRouteKey);
    lastRouteKey = route.key;
    const speed = randomBetween(7.2, 11.8) * Math.max(0.8, quality.motionScale) * cometConfig.speedScale;
    const tint = pickOne(cometPalette);
    const travelDistance = Math.sqrt(
      (route.end.x - route.start.x) * (route.end.x - route.start.x) +
      (route.end.y - route.start.y) * (route.end.y - route.start.y) +
      (route.end.z - route.start.z) * (route.end.z - route.start.z)
    );

    tempDirection
      .set(route.end.x - route.start.x, route.end.y - route.start.y, route.end.z - route.start.z)
      .normalize();
    tempLateral.set(-tempDirection.y, tempDirection.x, 0);

    if (tempLateral.lengthSq() < 0.0001) {
      tempLateral.set(0, 1, 0);
    } else {
      tempLateral.normalize();
    }

    comet.state.active = true;
    comet.state.elapsed = 0;
    comet.state.life = Math.max(3, (travelDistance / speed) * randomBetween(0.92, 1.14));
    comet.state.scale = randomBetween(cometConfig.scaleRange.min, cometConfig.scaleRange.max);
    comet.state.origin.set(route.start.x, route.start.y, route.start.z);
    comet.state.position.copy(comet.state.origin);
    comet.state.direction.copy(tempDirection);
    comet.state.tangent.copy(tempDirection);
    comet.state.lateralAxis.copy(tempLateral);
    comet.state.forwardDistance = 0;
    comet.state.speed = speed;
    comet.state.curveAmplitude = randomBetween(0.28, 0.82) * cometConfig.curveStrength;
    comet.state.curveFrequency = randomBetween(0.48, 1.14);
    comet.state.curvePhase = randomBetween(0, Math.PI * 2);
    comet.state.depthAmplitude = randomBetween(0.16, 0.62) * cometConfig.depthDriftStrength;
    comet.state.depthFrequency = randomBetween(0.22, 0.66);
    comet.state.depthPhase = randomBetween(0, Math.PI * 2);
    comet.state.glowBias = randomBetween(0.9, 1.12);
    comet.state.tailScaleX = randomBetween(2.1, 3.2);
    comet.tail.material.color.set(tint);
    comet.halo.material.color.set(tint);
    comet.head.material.color.set("#f3fbff");
    comet.tail.scale.set(comet.state.tailScaleX, randomBetween(0.11, 0.18), 1);
    comet.head.scale.setScalar(randomBetween(0.34, 0.5));
    comet.halo.scale.setScalar(randomBetween(0.72, 1.14));
    activeCount += 1;
    comet.root.visible = true;
    comet.root.position.copy(comet.state.position);
    comet.root.rotation.z = Math.atan2(tempDirection.y, tempDirection.x);
    comet.root.scale.setScalar(comet.state.scale);
    return true;
  }

  function update(frame) {
    const warpStrength = frame.warp?.strength || 0;
    const lightingStrength = frame.lightingPulse?.strength || 0;
    const blackHole = frame.blackHole;
    group.position.x = (frame.camera?.driftX || 0) * 0.22;
    group.position.y = (frame.camera?.driftY || 0) * 0.14;

    if (activeCount === 0) {
      return;
    }

    for (let index = 0; index < comets.length; index += 1) {
      const comet = comets[index];

      if (!comet.state.active) {
        continue;
      }

      comet.state.elapsed += frame.delta;
      comet.state.forwardDistance +=
        comet.state.speed *
        frame.delta *
        (0.92 + warpStrength * 0.16);

      const lateralOffset =
        Math.sin(frame.elapsed * comet.state.curveFrequency + comet.state.curvePhase) *
        comet.state.curveAmplitude;
      const depthOffset =
        Math.cos(frame.elapsed * comet.state.depthFrequency + comet.state.depthPhase) *
        comet.state.depthAmplitude;

      comet.state.position
        .copy(comet.state.origin)
        .addScaledVector(comet.state.direction, comet.state.forwardDistance)
        .addScaledVector(comet.state.lateralAxis, lateralOffset);
      comet.state.position.z += depthOffset;

      if (blackHole?.strength > 0.01) {
        const radius = blackHole.influenceRadius * 1.18;

        tempBlackHoleDirection.set(
          blackHole.position.x - comet.state.position.x,
          blackHole.position.y - comet.state.position.y,
          0
        );

        const distanceSq =
          tempBlackHoleDirection.x * tempBlackHoleDirection.x +
          tempBlackHoleDirection.y * tempBlackHoleDirection.y;

        if (distanceSq < radius * radius) {
          const distance = Math.sqrt(distanceSq) + 0.0001;
          const falloff = 1 - distance / radius;
          const pull = falloff * falloff * blackHole.pull * cometConfig.blackHoleInfluence;

          comet.state.position.addScaledVector(tempBlackHoleDirection.multiplyScalar(1 / distance), pull);
          comet.state.position.z -= pull * 0.14;
        }
      }

      tempTangent
        .copy(comet.state.direction)
        .addScaledVector(
          comet.state.lateralAxis,
          Math.cos(frame.elapsed * comet.state.curveFrequency + comet.state.curvePhase) *
            comet.state.curveAmplitude *
            comet.state.curveFrequency *
            0.22
        );
      tempTangent.z =
        -Math.sin(frame.elapsed * comet.state.depthFrequency + comet.state.depthPhase) *
        comet.state.depthAmplitude *
        comet.state.depthFrequency *
        0.14;
      comet.state.tangent.copy(tempTangent);
      comet.root.position.copy(comet.state.position);
      comet.root.rotation.z = Math.atan2(comet.state.tangent.y, comet.state.tangent.x);

      const lifeRatio = comet.state.elapsed / comet.state.life;
      const fade = lifeRatio < 0.18
        ? lifeRatio / 0.18
        : lifeRatio > 0.76
          ? (1 - lifeRatio) / 0.24
          : 1;
      const glow =
        fade *
        quality.glowStrength *
        comet.state.glowBias *
        (0.96 + lightingStrength * 0.12);

      comet.tail.material.opacity =
        0.085 * glow * cometConfig.trailIntensity * (1 - warpStrength * 0.12);
      comet.head.material.opacity = 0.15 * glow * (1 - warpStrength * 0.08);
      comet.halo.material.opacity =
        0.06 * glow * cometConfig.haloIntensity * (1 - warpStrength * 0.16);
      comet.tail.scale.x =
        comet.state.tailScaleX *
        (0.92 + Math.min(0.46, comet.state.speed * 0.02) + lightingStrength * 0.08);
      comet.root.scale.setScalar(comet.state.scale * (1 + lightingStrength * 0.04));

      if (
        comet.state.elapsed >= comet.state.life ||
        Math.abs(comet.state.position.x) > 42 ||
        Math.abs(comet.state.position.y) > 16
      ) {
        resetComet(comet);
      }
    }
  }

  function destroy() {
    group.parent?.remove(group);

    for (let index = 0; index < comets.length; index += 1) {
      comets[index].materials.forEach((material) => material.dispose());
    }

    shared.tailGeometry.dispose();
  }

  return {
    object3d: group,
    destroy,
    spawn,
    update
  };
}
