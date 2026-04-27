import { lerp, randomBetween } from "./motion.js";

const STAR_COLOR_HEX = ["#e8efff", "#b9d7ff", "#ffe3b8", "#d7fbff"];

function seedStar(layer, index, bounds, respawnAtStart = false) {
  const stride = index * 3;
  const x = respawnAtStart
    ? (layer.directionX >= 0
      ? -bounds.width - randomBetween(0, bounds.width * 0.52)
      : bounds.width + randomBetween(0, bounds.width * 0.52))
    : randomBetween(-bounds.width, bounds.width);
  const useBand = layer.bandInfluence > 0 && Math.random() < layer.bandInfluence;
  let y = respawnAtStart && Math.abs(layer.directionY) > 0.018
    ? (layer.directionY >= 0
      ? -bounds.height - randomBetween(0, bounds.height * 0.24)
      : bounds.height + randomBetween(0, bounds.height * 0.24))
    : randomBetween(-bounds.height, bounds.height);

  if (useBand) {
    const bandCenter =
      x * layer.bandSlope +
      layer.bandOffset +
      Math.sin(x * layer.bandCurve + layer.bandPhase) * layer.bandWave;
    const bandSpread = layer.bandSpread * randomBetween(0.18, 1);
    y = Math.max(
      -bounds.height * 1.12,
      Math.min(bounds.height * 1.12, bandCenter + randomBetween(-bandSpread, bandSpread))
    );
  }

  const z = randomBetween(layer.depthMin, layer.depthMax);
  const brightness = randomBetween(layer.brightness.min, layer.brightness.max);
  const color = layer.colorPalette[Math.floor(Math.random() * layer.colorPalette.length)];

  layer.positions[stride] = x;
  layer.positions[stride + 1] = y;
  layer.positions[stride + 2] = z;
  layer.baseColors[stride] = color.r * brightness;
  layer.baseColors[stride + 1] = color.g * brightness;
  layer.baseColors[stride + 2] = color.b * brightness;
  layer.colors[stride] = layer.baseColors[stride];
  layer.colors[stride + 1] = layer.baseColors[stride + 1];
  layer.colors[stride + 2] = layer.baseColors[stride + 2];
  layer.twinklePhase[index] = randomBetween(0, Math.PI * 2);
  layer.twinkleSpeed[index] = randomBetween(layer.twinkleSpeedRange.min, layer.twinkleSpeedRange.max);
  layer.travelScale[index] = randomBetween(0.74, 1.28);
  layer.driftAmplitude[index] = randomBetween(layer.drift.min, layer.drift.max);
  layer.driftPhase[index] = randomBetween(0, Math.PI * 2);
  layer.flickerBias[index] = randomBetween(0.82, 1.14);
}

function createLayer(THREE, definition, bounds, textures) {
  const positions = new Float32Array(definition.count * 3);
  const colors = new Float32Array(definition.count * 3);
  const baseColors = new Float32Array(definition.count * 3);
  const twinklePhase = new Float32Array(definition.count);
  const twinkleSpeed = new Float32Array(definition.count);
  const travelScale = new Float32Array(definition.count);
  const driftAmplitude = new Float32Array(definition.count);
  const driftPhase = new Float32Array(definition.count);
  const flickerBias = new Float32Array(definition.count);
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const colorAttribute = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
  const colorPalette = STAR_COLOR_HEX.map((value) => new THREE.Color(value));

  const layer = {
    ...definition,
    bounds,
    colorPalette,
    positions,
    colors,
    baseColors,
    twinklePhase,
    twinkleSpeed,
    travelScale,
    driftAmplitude,
    driftPhase,
    flickerBias,
    positionAttribute,
    colorAttribute,
    flowOffsetX: randomBetween(-0.12, 0.12),
    flowOffsetY: randomBetween(-0.08, 0.08),
    bandPhase: randomBetween(0, Math.PI * 2)
  };

  for (let index = 0; index < definition.count; index += 1) {
    seedStar(layer, index, bounds, false);
  }

  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", colorAttribute);

  const material = new THREE.PointsMaterial({
    map: textures.star,
    alphaMap: textures.star,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    opacity: definition.opacity,
    size: definition.size
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return {
    ...layer,
    geometry,
    material,
    points
  };
}

function createGlimmer(THREE, glowTexture, bounds, tint) {
  const material = new THREE.SpriteMaterial({
    map: glowTexture,
    color: new THREE.Color(tint),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: randomBetween(0.06, 0.14)
  });
  const sprite = new THREE.Sprite(material);
  const scale = randomBetween(0.14, 0.3);

  sprite.scale.set(scale, scale, 1);
  sprite.position.set(
    randomBetween(-bounds.width * 0.95, bounds.width * 0.95),
    randomBetween(-bounds.height * 0.88, bounds.height * 0.88),
    randomBetween(-34, 4)
  );
  sprite.userData = {
    baseScale: scale,
    baseOpacity: material.opacity,
    driftX: randomBetween(0.004, 0.02),
    driftY: randomBetween(0.002, 0.012),
    phase: randomBetween(0, Math.PI * 2),
    speed: randomBetween(0.12, 0.34)
  };

  return sprite;
}

export function createStarfield({ THREE, quality, textures }) {
  const group = new THREE.Group();
  const bounds = {
    width: 52,
    height: 31
  };

  const layers = [
    {
      count: Math.max(96, Math.round(quality.starCounts.far * 0.5)),
      size: 0.062,
      opacity: 0.18,
      depthMin: -76,
      depthMax: -52,
      speed: 0.036,
      scrollInfluence: 0.08,
      cameraInfluence: 0.035,
      lensingInfluence: 0.26,
      directionX: 1,
      directionY: -0.006,
      twinkleAmount: 0.022,
      twinkleSpeedRange: { min: 0.12, max: 0.26 },
      brightness: { min: 0.3, max: 0.58 },
      drift: { min: 0.0004, max: 0.0032 },
      bandInfluence: 0.9,
      bandSlope: -0.18,
      bandOffset: -1.8,
      bandSpread: 6.4,
      bandCurve: 0.06,
      bandWave: 1.48
    },
    {
      count: quality.starCounts.far,
      size: 0.09,
      opacity: 0.28,
      depthMin: -60,
      depthMax: -34,
      speed: 0.056,
      scrollInfluence: 0.14,
      cameraInfluence: 0.055,
      lensingInfluence: 0.22,
      directionX: 1,
      directionY: -0.009,
      twinkleAmount: 0.03,
      twinkleSpeedRange: { min: 0.18, max: 0.34 },
      brightness: { min: 0.46, max: 0.78 },
      drift: { min: 0.0008, max: 0.0048 },
      bandInfluence: 0.78,
      bandSlope: -0.16,
      bandOffset: -0.9,
      bandSpread: 5.3,
      bandCurve: 0.08,
      bandWave: 1.08
    },
    {
      count: quality.starCounts.mid,
      size: 0.136,
      opacity: 0.38,
      depthMin: -34,
      depthMax: -16,
      speed: 0.104,
      scrollInfluence: 0.26,
      cameraInfluence: 0.095,
      lensingInfluence: 0.17,
      directionX: 1,
      directionY: 0.008,
      twinkleAmount: 0.048,
      twinkleSpeedRange: { min: 0.28, max: 0.56 },
      brightness: { min: 0.6, max: 0.92 },
      drift: { min: 0.0014, max: 0.01 },
      bandInfluence: 0.5,
      bandSlope: -0.14,
      bandOffset: -0.4,
      bandSpread: 4.1,
      bandCurve: 0.08,
      bandWave: 0.72
    },
    {
      count: quality.starCounts.near,
      size: 0.194,
      opacity: 0.48,
      depthMin: -15,
      depthMax: 6,
      speed: 0.172,
      scrollInfluence: 0.4,
      cameraInfluence: 0.15,
      lensingInfluence: 0.1,
      directionX: 1,
      directionY: -0.005,
      twinkleAmount: 0.072,
      twinkleSpeedRange: { min: 0.42, max: 0.88 },
      brightness: { min: 0.7, max: 1.04 },
      drift: { min: 0.0026, max: 0.015 },
      bandInfluence: 0.2,
      bandSlope: -0.12,
      bandOffset: 0.4,
      bandSpread: 3.2,
      bandCurve: 0.07,
      bandWave: 0.46
    }
  ].map((definition) => createLayer(THREE, definition, bounds, textures));

  const glimmerGroup = new THREE.Group();
  const glimmers = [];
  const glimmerPalette = ["#edf4ff", "#97dfff", "#ffd9a4", "#bed7ff"];

  for (let index = 0; index < quality.glimmerCount; index += 1) {
    const sprite = createGlimmer(THREE, textures.glow, bounds, glimmerPalette[index % glimmerPalette.length]);
    glimmers.push(sprite);
    glimmerGroup.add(sprite);
  }

  for (let index = 0; index < layers.length; index += 1) {
    group.add(layers[index].points);
  }
  group.add(glimmerGroup);

  function update(frame) {
    const warpStrength = frame.warp?.strength || 0;
    const lightingStrength = frame.lightingPulse?.strength || 0;
    const scrollOffset = (frame.scrollProgress - 0.5) * 2;
    const cameraDriftX = frame.camera?.driftX || 0;
    const cameraDriftY = frame.camera?.driftY || 0;
    const blackHole = frame.blackHole;
    const lensX = blackHole ? (blackHole.position.x / bounds.width) * blackHole.pull * 0.9 : 0;
    const lensY = blackHole ? (blackHole.position.y / bounds.height) * blackHole.pull * 0.5 : 0;

    for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
      const layer = layers[layerIndex];
      const speed = layer.speed * quality.motionScale * (1 + warpStrength * (3.9 - layerIndex * 0.72));

      for (let index = 0; index < layer.count; index += 1) {
        const stride = index * 3;
        const travel = frame.delta * speed * layer.travelScale[index];
        const drift =
          Math.sin(frame.elapsed * (0.06 + layerIndex * 0.026) + layer.driftPhase[index]) *
          layer.driftAmplitude[index] *
          frame.delta;

        layer.positions[stride] += travel * layer.directionX;
        layer.positions[stride + 1] += travel * layer.directionY + drift;

        if (
          layer.positions[stride] > bounds.width * 1.04 ||
          layer.positions[stride] < -bounds.width * 1.04 ||
          layer.positions[stride + 1] > bounds.height * 1.14 ||
          layer.positions[stride + 1] < -bounds.height * 1.14
        ) {
          seedStar(layer, index, bounds, true);
        }

        const twinkle =
          1 -
          layer.twinkleAmount +
          Math.sin(frame.elapsed * layer.twinkleSpeed[index] + layer.twinklePhase[index]) * layer.twinkleAmount;
        const shimmer =
          Math.cos(frame.elapsed * (layer.twinkleSpeed[index] * 0.42) + layer.twinklePhase[index] * 0.7) *
          layer.twinkleAmount *
          0.32;
        const brightness = lerp(0.92, 1.16, (twinkle + 1) * 0.5) + shimmer + lightingStrength * 0.02;
        const bias = layer.flickerBias[index];

        layer.colors[stride] = layer.baseColors[stride] * brightness * bias;
        layer.colors[stride + 1] = layer.baseColors[stride + 1] * brightness * bias;
        layer.colors[stride + 2] = layer.baseColors[stride + 2] * brightness * bias;
      }

      layer.positionAttribute.needsUpdate = true;
      layer.colorAttribute.needsUpdate = true;
      layer.material.opacity = layer.opacity * (1 - warpStrength * 0.18) * (1.04 + lightingStrength * 0.08);
      layer.material.size = layer.size * (1.04 + warpStrength * (0.05 + layerIndex * 0.03));
      layer.points.position.x =
        scrollOffset * layer.scrollInfluence +
        cameraDriftX * layer.cameraInfluence +
        lensX * layer.lensingInfluence +
        Math.sin(frame.elapsed * (0.006 + layerIndex * 0.0026) + layer.flowOffsetX) * (0.07 + layerIndex * 0.034);
      layer.points.position.y =
        Math.sin(frame.elapsed * (0.012 + layerIndex * 0.007)) * (0.09 + layerIndex * 0.04) +
        cameraDriftY * layer.cameraInfluence * 0.7 +
        lensY * layer.lensingInfluence +
        Math.cos(frame.elapsed * (0.007 + layerIndex * 0.0024) + layer.flowOffsetY) * (0.04 + layerIndex * 0.022);
      layer.points.rotation.z =
        Math.sin(frame.elapsed * (0.003 + layerIndex * 0.0024)) * (0.004 + layerIndex * 0.003) +
        lensX * 0.003;
    }

    for (let index = 0; index < glimmers.length; index += 1) {
      const sprite = glimmers[index];
      const pulse = 0.9 + Math.sin(frame.elapsed * sprite.userData.speed + sprite.userData.phase + index * 0.42) * 0.1;
      const scale = sprite.userData.baseScale * (0.98 + pulse * 0.12 + lightingStrength * 0.03);

      sprite.material.opacity = sprite.userData.baseOpacity * pulse * (1 - warpStrength * 0.56);
      sprite.scale.set(scale, scale, 1);
      sprite.position.x += sprite.userData.driftX * frame.delta;
      sprite.position.y += Math.sin(frame.elapsed * 0.082 + sprite.userData.phase) * sprite.userData.driftY * frame.delta;

      if (sprite.position.x > bounds.width * 0.98) {
        sprite.position.x = -bounds.width * 0.98;
        sprite.position.y = randomBetween(-bounds.height * 0.9, bounds.height * 0.9);
      }
    }
  }

  function destroy() {
    group.parent?.remove(group);

    for (let index = 0; index < layers.length; index += 1) {
      layers[index].geometry.dispose();
      layers[index].material.dispose();
    }

    for (let index = 0; index < glimmers.length; index += 1) {
      glimmers[index].material.dispose();
    }
  }

  return {
    object3d: group,
    update,
    destroy
  };
}
