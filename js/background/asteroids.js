import { pickOne, randomBetween, randomSign } from "./motion.js";

const DEFAULT_ASTEROID_CONFIG = {
  speedScale: 1,
  driftStrength: 1,
  blackHoleInfluence: 0.12,
  silhouetteOpacity: 0.34,
  scaleRange: {
    min: 0.12,
    max: 0.34
  }
};

function mergeAsteroidConfig(overrides = {}) {
  return {
    ...DEFAULT_ASTEROID_CONFIG,
    ...overrides,
    scaleRange: {
      ...DEFAULT_ASTEROID_CONFIG.scaleRange,
      ...overrides.scaleRange
    }
  };
}

function hideInstance(dummy, mesh, index) {
  dummy.position.set(0, -999, -999);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.setScalar(0.0001);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function seedAsteroid(state, asteroidConfig) {
  const entry = pickOne(["left", "right", "top", "bottom", "diag-left", "diag-right"]);
  const startZ = randomBetween(-28, -12);
  const endZ = startZ + randomBetween(-2.2, 1.4);
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;

  switch (entry) {
    case "right":
      startX = 34 + randomBetween(0, 7);
      startY = pickOne([randomBetween(-10.4, -5.6), randomBetween(4.8, 10.2)]);
      endX = randomBetween(-18, -8);
      endY = startY + randomBetween(-4.4, 4.4);
      break;
    case "top":
      startX = pickOne([randomBetween(-18.8, -10.8), randomBetween(10.8, 18.8)]);
      startY = 14 + randomBetween(0, 4);
      endX = startX + randomBetween(-8.2, 8.2);
      endY = randomBetween(-8.8, -2.6);
      break;
    case "bottom":
      startX = pickOne([randomBetween(-18.8, -10.8), randomBetween(10.8, 18.8)]);
      startY = -14 - randomBetween(0, 4);
      endX = startX + randomBetween(-8.2, 8.2);
      endY = randomBetween(2.6, 8.8);
      break;
    case "diag-left":
      startX = 34 + randomBetween(0, 6);
      startY = randomBetween(-9.6, 9.6);
      endX = -24 - randomBetween(0, 8);
      endY = startY + randomBetween(-6.8, 6.8);
      break;
    case "diag-right":
      startX = -34 - randomBetween(0, 6);
      startY = randomBetween(-9.6, 9.6);
      endX = 24 + randomBetween(0, 8);
      endY = startY + randomBetween(-6.8, 6.8);
      break;
    default:
      startX = -34 - randomBetween(0, 7);
      startY = pickOne([randomBetween(-10.4, -5.6), randomBetween(4.8, 10.2)]);
      endX = randomBetween(8, 18);
      endY = startY + randomBetween(-4.4, 4.4);
      break;
  }

  state.active = true;
  state.origin.set(startX, startY, startZ);
  state.position.copy(state.origin);
  state.direction.set(endX - startX, endY - startY, endZ - startZ).normalize();
  state.lateralAxis.set(-state.direction.y, state.direction.x, 0);

  if (state.lateralAxis.lengthSq() < 0.0001) {
    state.lateralAxis.set(0, 1, 0);
  } else {
    state.lateralAxis.normalize();
  }

  state.forwardDistance = 0;
  state.speed = randomBetween(3.8, 8.2) * asteroidConfig.speedScale;
  state.scale = randomBetween(asteroidConfig.scaleRange.min, asteroidConfig.scaleRange.max);
  state.rotation.set(randomBetween(0, Math.PI * 2), randomBetween(0, Math.PI * 2), randomBetween(0, Math.PI * 2));
  state.spin.set(
    randomBetween(0.01, 0.04) * randomSign(),
    randomBetween(0.008, 0.03) * randomSign(),
    randomBetween(0.008, 0.024) * randomSign()
  );
  state.color.set(pickOne(["#182131", "#141c2a", "#20283a", "#1f1b27"]));
  state.life = randomBetween(14, 28);
  state.elapsed = 0;
  state.driftPhase = randomBetween(0, Math.PI * 2);
  state.driftSpeed = randomBetween(0.26, 0.72);
  state.driftAmount = randomBetween(0.14, 0.42) * asteroidConfig.driftStrength;
  state.depthPhase = randomBetween(0, Math.PI * 2);
  state.depthSpeed = randomBetween(0.18, 0.46);
  state.depthAmount = randomBetween(0.18, 0.72) * asteroidConfig.driftStrength;
  state.silhouetteBias = randomBetween(0.86, 1.08);
}

export function createAsteroids({ THREE, quality, config = {} }) {
  const asteroidConfig = mergeAsteroidConfig(config);
  const group = new THREE.Group();
  const geometry = new THREE.DodecahedronGeometry(0.72, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0x263244,
    emissive: 0x0c1220,
    emissiveIntensity: 0.38,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    transparent: true,
    opacity: asteroidConfig.silhouetteOpacity
  });
  const mesh = new THREE.InstancedMesh(geometry, material, quality.asteroidPoolSize);
  const dummy = new THREE.Object3D();
  const asteroids = [];
  const tempBlackHoleDirection = new THREE.Vector3();
  let activeCount = 0;
  let colorDirty = false;

  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;

  for (let index = 0; index < quality.asteroidPoolSize; index += 1) {
    asteroids.push({
      active: false,
      origin: new THREE.Vector3(),
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      lateralAxis: new THREE.Vector3(),
      forwardDistance: 0,
      speed: 0,
      rotation: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      color: new THREE.Color(),
      scale: 1,
      life: 0,
      elapsed: 0,
      driftPhase: 0,
      driftSpeed: 0,
      driftAmount: 0,
      depthPhase: 0,
      depthSpeed: 0,
      depthAmount: 0,
      silhouetteBias: 1
    });
    hideInstance(dummy, mesh, index);
  }

  group.add(mesh);
  mesh.instanceMatrix.needsUpdate = true;

  function getActiveCount() {
    return activeCount;
  }

  function acquireInactiveIndex() {
    for (let index = 0; index < asteroids.length; index += 1) {
      if (!asteroids[index].active) {
        return index;
      }
    }

    return -1;
  }

  function resetAsteroid(index) {
    const asteroid = asteroids[index];

    if (!asteroid.active) {
      return;
    }

    asteroid.active = false;
    activeCount = Math.max(0, activeCount - 1);
    hideInstance(dummy, mesh, index);
  }

  function spawn() {
    if (activeCount >= quality.maxActiveAsteroids) {
      return false;
    }

    const availableIndex = acquireInactiveIndex();

    if (availableIndex < 0) {
      return false;
    }

    const asteroid = asteroids[availableIndex];
    seedAsteroid(asteroid, asteroidConfig);
    mesh.setColorAt(availableIndex, asteroid.color);
    colorDirty = true;
    activeCount += 1;
    return true;
  }

  function update(frame) {
    const lightingStrength = frame.lightingPulse?.strength || 0;
    const warpStrength = frame.warp?.strength || 0;
    const blackHole = frame.blackHole;

    group.position.x = (frame.camera?.driftX || 0) * 0.16;
    group.position.y = (frame.camera?.driftY || 0) * 0.1;
    material.opacity =
      asteroidConfig.silhouetteOpacity *
      (0.98 + lightingStrength * 0.14) *
      (1 - warpStrength * 0.08);

    if (activeCount === 0) {
      if (colorDirty && mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
        colorDirty = false;
      }

      return;
    }

    for (let index = 0; index < asteroids.length; index += 1) {
      const asteroid = asteroids[index];

      if (!asteroid.active) {
        continue;
      }

      asteroid.elapsed += frame.delta;
      asteroid.forwardDistance +=
        asteroid.speed *
        frame.delta *
        (0.74 + quality.motionScale * 0.78 + warpStrength * 0.1);

      const lateralOffset =
        Math.sin(asteroid.elapsed * asteroid.driftSpeed + asteroid.driftPhase) *
        asteroid.driftAmount;
      const verticalOffset =
        Math.cos(asteroid.elapsed * asteroid.driftSpeed * 0.72 + asteroid.driftPhase) *
        asteroid.driftAmount *
        0.48;
      const depthOffset =
        Math.cos(asteroid.elapsed * asteroid.depthSpeed + asteroid.depthPhase) *
        asteroid.depthAmount;

      asteroid.position
        .copy(asteroid.origin)
        .addScaledVector(asteroid.direction, asteroid.forwardDistance)
        .addScaledVector(asteroid.lateralAxis, lateralOffset);
      asteroid.position.y += verticalOffset;
      asteroid.position.z += depthOffset;

      if (blackHole?.strength > 0.01) {
        const radius = blackHole.influenceRadius * 1.06;

        tempBlackHoleDirection.set(
          blackHole.position.x - asteroid.position.x,
          blackHole.position.y - asteroid.position.y,
          0
        );

        const distanceSq =
          tempBlackHoleDirection.x * tempBlackHoleDirection.x +
          tempBlackHoleDirection.y * tempBlackHoleDirection.y;

        if (distanceSq < radius * radius) {
          const distance = Math.sqrt(distanceSq) + 0.0001;
          const falloff = 1 - distance / radius;
          const pull = falloff * falloff * blackHole.pull * asteroidConfig.blackHoleInfluence;

          asteroid.position.addScaledVector(tempBlackHoleDirection.multiplyScalar(1 / distance), pull);
          asteroid.position.z -= pull * 0.18;
        }
      }

      asteroid.rotation.x += asteroid.spin.x * frame.delta;
      asteroid.rotation.y += asteroid.spin.y * frame.delta;
      asteroid.rotation.z += asteroid.spin.z * frame.delta;

      if (
        asteroid.elapsed >= asteroid.life ||
        Math.abs(asteroid.position.x) > 40 ||
        Math.abs(asteroid.position.y) > 17
      ) {
        resetAsteroid(index);
        continue;
      }

      dummy.position.copy(asteroid.position);
      dummy.rotation.set(asteroid.rotation.x, asteroid.rotation.y, asteroid.rotation.z);
      dummy.scale.setScalar(asteroid.scale * asteroid.silhouetteBias * (0.98 + lightingStrength * 0.03));
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;

    if (colorDirty && mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
      colorDirty = false;
    }
  }

  function destroy() {
    group.parent?.remove(group);
    geometry.dispose();
    material.dispose();
  }

  function getActivePositions() {
    const out = [];
    for (let i = 0; i < asteroids.length; i++) {
      if (asteroids[i].active) {
        out.push({ x: asteroids[i].position.x, y: asteroids[i].position.y, z: asteroids[i].position.z });
      }
    }
    return out;
  }

  return {
    object3d: group,
    destroy,
    getActiveCount,
    getActivePositions,
    spawn,
    update
  };
}
