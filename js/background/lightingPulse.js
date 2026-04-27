import { pickOne, randomBetween, smoothstep } from "./motion.js";

const DEFAULT_LIGHTING_PULSE_CONFIG = {
  lightingPulseIntensity: 0.042,
  energyPulseSpeed: 0.08,
  impactChance: 0.32,
  interval: {
    min: 18,
    max: 32
  },
  duration: {
    min: 6.4,
    max: 11.2
  },
  landscapePosition: [19.2, 8.8, -40],
  portraitPosition: [13.6, 10.4, -40]
};

function mergeLightingPulseConfig(overrides = {}) {
  return {
    ...DEFAULT_LIGHTING_PULSE_CONFIG,
    ...overrides,
    interval: {
      ...DEFAULT_LIGHTING_PULSE_CONFIG.interval,
      ...overrides.interval
    },
    duration: {
      ...DEFAULT_LIGHTING_PULSE_CONFIG.duration,
      ...overrides.duration
    },
    landscapePosition: [...(overrides.landscapePosition || DEFAULT_LIGHTING_PULSE_CONFIG.landscapePosition)],
    portraitPosition: [...(overrides.portraitPosition || DEFAULT_LIGHTING_PULSE_CONFIG.portraitPosition)]
  };
}

export function createLightingPulse({
  THREE,
  quality,
  textures,
  ambientLight,
  keyLight,
  rimLight,
  viewport,
  config = {}
}) {
  const lightingConfig = mergeLightingPulseConfig(config);
  const group = new THREE.Group();
  const overlay = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glow,
      color: new THREE.Color("#6cbcff"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0
    })
  );
  const impact = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glow,
      color: new THREE.Color("#9dd7ff"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0
    })
  );
  const sweep = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glow,
      color: new THREE.Color("#8abfff"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0
    })
  );
  const baseAmbientIntensity = ambientLight.intensity;
  const baseKeyIntensity = keyLight.intensity;
  const baseRimIntensity = rimLight.intensity;
  const overlayPalette = ["#6cbcff", "#6fd9ff", "#8b85ff", "#9bc2ff"];
  const impactPalette = ["#ffd1a2", "#8fd8ff", "#ffb88f", "#a4cbff"];
  const driftPhaseX = randomBetween(0, Math.PI * 2);
  const driftPhaseY = randomBetween(0, Math.PI * 2);
  let timer = randomBetween(lightingConfig.interval.min, lightingConfig.interval.max);
  let active = false;
  let elapsed = 0;
  let duration = 0;
  let eventDriftX = 0;
  let eventDriftY = 0;
  let impactX = 0;
  let impactY = 0;
  let mode = "ambient";
  let eventFamily = "sweep";
  let sweepRotation = 0;
  let overlayScale = 22;
  let impactScale = 3.8;

  overlay.scale.set(22, 22, 1);
  impact.scale.set(3.8, 3.8, 1);
  sweep.scale.set(30, 12, 1);
  group.add(sweep, overlay, impact);

  const state = {
    strength: 0,
    emissiveBoost: 1,
    ambientBoost: 1
  };

  function resize(nextViewport = viewport) {
    const portrait = nextViewport.height > nextViewport.width;
    const anchor = portrait ? lightingConfig.portraitPosition : lightingConfig.landscapePosition;

    group.position.set(anchor[0], anchor[1], anchor[2]);
  }

  resize(viewport);

  function init(scene) {
    if (scene && group.parent !== scene) {
      scene.add(group);
    }
  }

  function scheduleNext() {
    timer =
      randomBetween(lightingConfig.interval.min, lightingConfig.interval.max) *
      randomBetween(0.9, 1.22);
  }

  function beginPulse() {
    active = true;
    elapsed = 0;
    mode = Math.random() < lightingConfig.impactChance ? "impact" : "ambient";
    eventFamily = pickOne(["sweep", "bloom", "distant-impact"]);
    duration = randomBetween(lightingConfig.duration.min, lightingConfig.duration.max) * (mode === "impact" ? 0.72 : 1);
    eventDriftX = randomBetween(-1.4, 1.4);
    eventDriftY = randomBetween(-1, 1);
    sweepRotation = randomBetween(-0.32, 0.32);
    overlayScale = randomBetween(22, mode === "impact" ? 28 : 26);
    impactScale = randomBetween(mode === "impact" ? 4.4 : 3.4, mode === "impact" ? 5.8 : 4.2);
    overlay.material.color.set(pickOne(overlayPalette));
    sweep.material.color.set(pickOne(overlayPalette));
    impact.material.color.set(pickOne(impactPalette));
    impactX = pickOne([randomBetween(-14.8, -9.2), randomBetween(9.2, 14.8)]);
    impactY = pickOne([randomBetween(-7.8, -3.1), randomBetween(3.1, 7.8)]);
  }

  function update(frame) {
    if (!active) {
      timer -= frame.delta;

      if (timer <= 0) {
        beginPulse();
        scheduleNext();
      }
    } else {
      elapsed += frame.delta;

      if (elapsed >= duration) {
        active = false;
      }
    }

    const progress = elapsed / Math.max(0.001, duration);
    const target = active
      ? smoothstep(0, 0.24, progress) * (1 - smoothstep(0.68, 1, progress)) * (mode === "impact" ? 0.72 : 0.56)
      : 0;
    const easing = Math.min(1, frame.delta * (0.22 + lightingConfig.energyPulseSpeed * 1.7));

    state.strength += (target - state.strength) * easing;

    const pulse = state.strength * lightingConfig.lightingPulseIntensity;
    const cameraDriftX = frame.camera?.driftX || 0;
    const cameraDriftY = frame.camera?.driftY || 0;

    ambientLight.intensity = baseAmbientIntensity * (1 + pulse * 0.08);
    keyLight.intensity = baseKeyIntensity * (1 + pulse * 0.12);
    rimLight.intensity = baseRimIntensity * (1 + pulse * 0.18);
    overlay.material.opacity =
      pulse *
      (mode === "impact" ? 0.034 : 0.052) *
      quality.glowStrength *
      (eventFamily === "bloom" ? 1.14 : 1);
    overlay.scale.setScalar(overlayScale * (1 + pulse * (mode === "impact" ? 0.08 : 0.11)));
    overlay.position.x =
      eventDriftX +
      cameraDriftX * 0.08 +
      Math.sin(frame.elapsed * 0.012 + driftPhaseX) * 0.3 +
      Math.cos(frame.elapsed * 0.004 + driftPhaseY) * 0.08;
    overlay.position.y =
      eventDriftY +
      cameraDriftY * 0.06 +
      Math.cos(frame.elapsed * 0.01 + driftPhaseY) * 0.18 +
      Math.sin(frame.elapsed * 0.003 + driftPhaseX) * 0.06;
    sweep.material.opacity =
      pulse *
      (mode === "impact" ? 0.02 : 0.034) *
      quality.glowStrength *
      (eventFamily === "sweep" ? 1.2 : 0.92);
    sweep.scale.set(
      30 * (1 + pulse * (eventFamily === "sweep" ? 0.12 : 0.08)),
      12 * (1 + pulse * (eventFamily === "distant-impact" ? 0.08 : 0.05)),
      1
    );
    sweep.position.x = eventDriftX * 0.7 - cameraDriftX * 0.05;
    sweep.position.y = eventDriftY * 0.42 + cameraDriftY * 0.04;
    sweep.material.rotation =
      sweepRotation +
      Math.sin(frame.elapsed * 0.01 + driftPhaseX) * 0.04 +
      (eventFamily === "sweep" ? pulse * 0.08 : pulse * 0.03);
    impact.material.opacity =
      pulse *
      (mode === "impact" ? 0.14 : 0.03) *
      quality.glowStrength *
      (eventFamily === "distant-impact" ? 1.16 : 1);
    impact.scale.setScalar(impactScale * (1 + pulse * 0.22));
    impact.position.x = impactX + Math.sin(frame.elapsed * 0.018 + driftPhaseX * 0.6) * 0.22;
    impact.position.y = impactY + Math.cos(frame.elapsed * 0.016 + driftPhaseY * 0.7) * 0.16;

    state.emissiveBoost = 1 + pulse * 0.16;
    state.ambientBoost = 1 + pulse * 0.08;
  }

  function destroy() {
    ambientLight.intensity = baseAmbientIntensity;
    keyLight.intensity = baseKeyIntensity;
    rimLight.intensity = baseRimIntensity;
    group.parent?.remove(group);
    overlay.material.dispose();
    impact.material.dispose();
    sweep.material.dispose();
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
