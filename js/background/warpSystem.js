import { pickDifferent, pickQualityValue, randomBetween, randomSign, smoothstep } from "./motion.js";

const DEFAULT_WARP_CONFIG = {
  warpFrequency: {
    min: 22,
    max: 40
  },
  warpSpeed: 0.24,
  streakIntensity: 0.8,
  particleDensity: 0.72,
  duration: {
    min: 2.8,
    max: 5.4
  },
  streakCount: {
    low: 4,
    medium: 8,
    high: 12
  }
};

function mergeWarpConfig(overrides = {}) {
  return {
    ...DEFAULT_WARP_CONFIG,
    ...overrides,
    warpFrequency: {
      ...DEFAULT_WARP_CONFIG.warpFrequency,
      ...overrides.warpFrequency
    },
    duration: {
      ...DEFAULT_WARP_CONFIG.duration,
      ...overrides.duration
    },
    streakCount: {
      ...DEFAULT_WARP_CONFIG.streakCount,
      ...overrides.streakCount
    }
  };
}

function seedEvent(eventState, previousFamily = "") {
  const family = pickDifferent([
    "left-rising",
    "left-falling",
    "right-rising",
    "right-falling",
    "cross-high",
    "cross-low",
    "center-skimming-left",
    "center-skimming-right"
  ], previousFamily);
  const mode = Math.random() < 0.24 ? "burst" : Math.random() < 0.58 ? "fleet" : "scout";

  eventState.family = family;
  eventState.mode = mode;
  eventState.depth = randomBetween(-42, -28);
  eventState.speed = randomBetween(
    mode === "burst" ? 2.8 : mode === "fleet" ? 2.1 : 1.7,
    mode === "burst" ? 4.4 : mode === "fleet" ? 3.5 : 2.8
  );
  eventState.length = randomBetween(
    mode === "burst" ? 2.2 : 1.6,
    mode === "fleet" ? 4.6 : 3.8
  );
  eventState.tilt = randomBetween(-0.08, 0.08);
  eventState.curveStrength = randomBetween(0.24, mode === "burst" ? 0.72 : 0.5);
  eventState.swayAmplitude = randomBetween(0.18, 0.56);
  eventState.swayFrequency = randomBetween(0.18, 0.54);
  eventState.brightness = randomBetween(mode === "burst" ? 1.12 : 0.9, mode === "burst" ? 1.38 : 1.16);
  eventState.bandDrift = randomBetween(-0.34, 0.34);

  switch (family) {
    case "left-falling":
      eventState.directionX = 1;
      eventState.directionY = randomBetween(-0.14, -0.05);
      eventState.originX = -34 - randomBetween(0, 8);
      eventState.originY = randomBetween(3.6, 8.2);
      break;
    case "right-rising":
      eventState.directionX = -1;
      eventState.directionY = randomBetween(0.05, 0.14);
      eventState.originX = 34 + randomBetween(0, 8);
      eventState.originY = randomBetween(-8.2, -3.6);
      break;
    case "right-falling":
      eventState.directionX = -1;
      eventState.directionY = randomBetween(-0.14, -0.05);
      eventState.originX = 34 + randomBetween(0, 8);
      eventState.originY = randomBetween(3.6, 8.2);
      break;
    case "cross-high":
      eventState.directionX = randomSign();
      eventState.directionY = randomBetween(-0.04, 0.04);
      eventState.originX = eventState.directionX > 0 ? -34 - randomBetween(0, 8) : 34 + randomBetween(0, 8);
      eventState.originY = randomBetween(7.2, 10.4);
      break;
    case "cross-low":
      eventState.directionX = randomSign();
      eventState.directionY = randomBetween(-0.04, 0.04);
      eventState.originX = eventState.directionX > 0 ? -34 - randomBetween(0, 8) : 34 + randomBetween(0, 8);
      eventState.originY = randomBetween(-10.4, -7.2);
      break;
    case "center-skimming-left":
      eventState.directionX = -1;
      eventState.directionY = randomBetween(-0.03, 0.03);
      eventState.originX = 34 + randomBetween(0, 8);
      eventState.originY = randomBetween(-2.4, 2.4);
      break;
    case "center-skimming-right":
      eventState.directionX = 1;
      eventState.directionY = randomBetween(-0.03, 0.03);
      eventState.originX = -34 - randomBetween(0, 8);
      eventState.originY = randomBetween(-2.4, 2.4);
      break;
    default:
      eventState.directionX = 1;
      eventState.directionY = randomBetween(0.05, 0.14);
      eventState.originX = -34 - randomBetween(0, 8);
      eventState.originY = randomBetween(-8.2, -3.6);
      break;
  }
}

function respawnStreak(streak, eventState, initial = false) {
  const offset = initial ? randomBetween(0, 24) : randomBetween(8, 22);

  streak.travel = -offset + randomBetween(-2.4, 2.4);
  streak.bandOffset = randomBetween(-6.4, 6.4);
  streak.forwardSpread = randomBetween(-3.6, 3.6);
  streak.depthOffset = randomBetween(-6, 4);
  streak.speed = eventState.speed * randomBetween(0.82, 1.24);
  streak.length = eventState.length * randomBetween(0.74, 1.16);
  streak.opacity = randomBetween(0.32, 0.72);
  streak.width = randomBetween(0.72, 1.18);
  streak.phase = randomBetween(0, Math.PI * 2);
  streak.coolMix = randomBetween(0.88, 1);
  streak.midMix = randomBetween(0.82, 0.94);
  streak.warmMix = randomBetween(0.62, 0.78);
  streak.curveAmplitude = eventState.curveStrength * randomBetween(0.6, 1.2);
  streak.curveFrequency = randomBetween(0.24, 0.72);
  streak.depthAmplitude = randomBetween(0.14, 0.64);
  streak.depthFrequency = randomBetween(0.16, 0.46);
  streak.brightness = randomBetween(0.86, 1.12) * eventState.brightness;
}

export function createWarpSystem({ THREE, quality, config = {} }) {
  const warpConfig = mergeWarpConfig(config);
  const streakCount = Math.max(
    0,
    Math.round(pickQualityValue(warpConfig.streakCount, quality.name) * warpConfig.particleDensity)
  );
  const enabled = streakCount > 0;
  const group = new THREE.Group();
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(Math.max(1, streakCount) * 6);
  const colors = new Float32Array(Math.max(1, streakCount) * 6);
  const positionAttribute = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const colorAttribute = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
  const material = new THREE.LineBasicMaterial({
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0
  });
  const lines = new THREE.LineSegments(geometry, material);
  const streaks = [];
  const eventState = {
    directionX: 1,
    directionY: 0,
    family: "left-rising",
    mode: "scout",
    originX: 0,
    originY: 0,
    depth: -36,
    speed: 2,
    length: 2.4,
    tilt: 0,
    curveStrength: 0.2,
    swayAmplitude: 0.2,
    swayFrequency: 0.2,
    brightness: 1,
    bandDrift: 0
  };
  let timer = randomBetween(warpConfig.warpFrequency.min, warpConfig.warpFrequency.max);
  let elapsed = 0;
  let duration = 0;
  let active = false;
  let lastFamily = "";
  const driftPhaseX = randomBetween(0, Math.PI * 2);
  const driftPhaseY = randomBetween(0, Math.PI * 2);
  const state = {
    active: false,
    strength: 0,
    warpSpeed: 1
  };

  lines.frustumCulled = false;
  lines.visible = false;

  seedEvent(eventState, lastFamily);
  lastFamily = eventState.family;

  for (let index = 0; index < streakCount; index += 1) {
    const streak = {
      travel: 0,
      bandOffset: 0,
      forwardSpread: 0,
      depthOffset: 0,
      speed: 0,
      length: 0,
      opacity: 0,
      width: 1,
      phase: 0,
      coolMix: 1,
      midMix: 0.9,
      warmMix: 0.72,
      curveAmplitude: 0,
      curveFrequency: 0,
      depthAmplitude: 0,
      depthFrequency: 0,
      brightness: 1
    };

    respawnStreak(streak, eventState, true);
    streaks.push(streak);
  }

  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", colorAttribute);
  group.add(lines);

  function scheduleNextEvent() {
    timer =
      randomBetween(warpConfig.warpFrequency.min, warpConfig.warpFrequency.max) *
      randomBetween(0.88, 1.18);
  }

  function init(scene) {
    if (scene && group.parent !== scene) {
      scene.add(group);
    }
  }

  function triggerEvent() {
    if (!enabled) {
      return;
    }

    active = true;
    elapsed = 0;
    duration = randomBetween(warpConfig.duration.min, warpConfig.duration.max);
    seedEvent(eventState, lastFamily);
    lastFamily = eventState.family;
    lines.visible = true;

    for (let index = 0; index < streaks.length; index += 1) {
      respawnStreak(streaks[index], eventState, true);
    }
  }

  function update(frame) {
    if (!enabled) {
      state.active = false;
      state.strength = 0;
      state.warpSpeed = 1;
      return;
    }

    if (!active) {
      timer -= frame.delta;

      if (timer <= 0) {
        triggerEvent();
        scheduleNextEvent();
      }
    } else {
      elapsed += frame.delta;

      if (elapsed >= duration) {
        active = false;
      }
    }

    const progress = elapsed / Math.max(0.001, duration);
    const targetStrength = active
      ? smoothstep(0, 0.22, progress) * (1 - smoothstep(0.72, 1, progress)) *
        (eventState.mode === "burst" ? 0.38 : eventState.mode === "fleet" ? 0.32 : 0.26)
      : 0;
    const easing = Math.min(1, frame.delta * 0.86);

    state.strength += (targetStrength - state.strength) * easing;
    state.active = active || state.strength > 0.01;
    state.warpSpeed = 1 + state.strength * warpConfig.warpSpeed * (eventState.mode === "burst" ? 1 : 0.8);
    material.opacity =
      state.strength *
      0.22 *
      warpConfig.streakIntensity *
      quality.glowStrength *
      eventState.brightness;
    lines.visible = material.opacity > 0.004;

    if (!lines.visible) {
      return;
    }

    const directionLength = Math.sqrt(eventState.directionX * eventState.directionX + eventState.directionY * eventState.directionY);
    const dirX = eventState.directionX / directionLength;
    const dirY = eventState.directionY / directionLength;
    const normalX = -dirY;
    const normalY = dirX;

    group.position.x =
      (frame.scrollProgress - 0.5) * 1.2 +
      Math.sin(frame.elapsed * 0.01 + driftPhaseX) * 0.14 +
      (frame.camera?.driftX || 0) * 0.08;
    group.position.y =
      Math.cos(frame.elapsed * 0.008 + driftPhaseY) * 0.08 +
      eventState.bandDrift * state.strength * 0.12 +
      (frame.camera?.driftY || 0) * 0.05;
    group.rotation.z =
      eventState.tilt * state.strength +
      Math.sin(frame.elapsed * 0.006 + driftPhaseX * 0.7) * 0.01;

    for (let index = 0; index < streaks.length; index += 1) {
      const streak = streaks[index];
      const stride = index * 6;
      const velocity = streak.speed * state.warpSpeed * quality.motionScale;

      streak.travel += velocity * frame.delta;

      const curve =
        Math.sin(frame.elapsed * streak.curveFrequency + streak.phase + streak.travel * 0.08) *
        streak.curveAmplitude *
        (0.86 + state.strength * 0.4);
      const sway =
        Math.sin(frame.elapsed * eventState.swayFrequency + streak.phase) *
        eventState.swayAmplitude *
        state.strength;
      const band = streak.bandOffset + curve + sway;
      const headTravel = streak.travel + streak.forwardSpread;
      const headX = eventState.originX + dirX * headTravel + normalX * band;
      const headY = eventState.originY + dirY * headTravel + normalY * band;
      const headZ =
        eventState.depth +
        streak.depthOffset +
        Math.cos(frame.elapsed * streak.depthFrequency + streak.phase) * streak.depthAmplitude;

      if (
        Math.abs(headX) > 38 ||
        Math.abs(headY) > 18
      ) {
        respawnStreak(streak, eventState, false);
        continue;
      }

      const tailLength = streak.length * (0.7 + state.strength * 0.8);
      const endBand = band - curve * 0.2;
      const endX = eventState.originX + dirX * (headTravel - tailLength) + normalX * endBand;
      const endY = eventState.originY + dirY * (headTravel - tailLength) + normalY * endBand;
      const endZ = headZ - streak.width;
      const intensity =
        (0.036 + state.strength * 0.14) *
        streak.opacity *
        warpConfig.streakIntensity *
        streak.brightness;
      const cool = intensity * streak.coolMix;
      const mid = intensity * streak.midMix;
      const warm = intensity * streak.warmMix;

      positions[stride] = headX;
      positions[stride + 1] = headY;
      positions[stride + 2] = headZ;
      positions[stride + 3] = endX;
      positions[stride + 4] = endY;
      positions[stride + 5] = endZ;

      colors[stride] = cool * 0.6;
      colors[stride + 1] = mid * 0.78;
      colors[stride + 2] = cool;
      colors[stride + 3] = warm * 0.34;
      colors[stride + 4] = mid * 0.54;
      colors[stride + 5] = cool * 0.72;
    }

    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  }

  function destroy() {
    group.parent?.remove(group);
    geometry.dispose();
    material.dispose();
  }

  return {
    destroy,
    getState: () => state,
    init,
    object3d: group,
    update
  };
}
