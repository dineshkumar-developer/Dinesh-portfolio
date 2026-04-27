import { blend } from "./motion.js";

const DEFAULT_NEBULA_SHADER_CONFIG = {
  nebulaIntensity: 0.21,
  nebulaSpeed: 0.048,
  nebulaDepth: 1,
  bandStrength: 0.28,
  particleDensity: 0.92,
  layers: [
    {
      landscapePosition: [0.8, -1.2, -60],
      portraitPosition: [0.4, -1.8, -60],
      scale: [76, 32],
      opacity: 0.094,
      seed: 0.11,
      driftX: 0.08,
      driftY: 0.03,
      scrollInfluence: 0.04,
      rotationSpeed: 0.0024,
      rotationRange: 0.01,
      additive: false,
      colorA: "#040914",
      colorB: "#11223d",
      colorC: "#2c5786"
    },
    {
      landscapePosition: [-18.8, -4.8, -54],
      portraitPosition: [-12.8, -5.6, -54],
      scale: [54, 26],
      opacity: 0.152,
      seed: 0.37,
      driftX: 0.12,
      driftY: 0.07,
      scrollInfluence: 0.1,
      rotationSpeed: 0.0042,
      rotationRange: 0.016,
      additive: false,
      colorA: "#071328",
      colorB: "#224477",
      colorC: "#5b49b6"
    },
    {
      landscapePosition: [20.8, 7.6, -50],
      portraitPosition: [13.8, 8.9, -50],
      scale: [40, 21],
      opacity: 0.176,
      seed: 1.13,
      driftX: 0.095,
      driftY: 0.058,
      scrollInfluence: 0.08,
      rotationSpeed: 0.0038,
      rotationRange: 0.014,
      additive: false,
      colorA: "#071225",
      colorB: "#2c3678",
      colorC: "#59b7d9"
    },
    {
      landscapePosition: [11.2, -10.4, -46],
      portraitPosition: [8.4, -11.8, -46],
      scale: [30, 16],
      opacity: 0.104,
      seed: 2.01,
      driftX: 0.075,
      driftY: 0.042,
      scrollInfluence: 0.06,
      rotationSpeed: 0.0052,
      rotationRange: 0.012,
      additive: false,
      colorA: "#0d1327",
      colorB: "#443b81",
      colorC: "#7cd6ef"
    },
    {
      landscapePosition: [-4.8, 4.8, -42],
      portraitPosition: [-3.2, 5.6, -42],
      scale: [24, 12],
      opacity: 0.072,
      seed: 2.63,
      driftX: 0.058,
      driftY: 0.038,
      scrollInfluence: 0.05,
      rotationSpeed: 0.006,
      rotationRange: 0.01,
      additive: true,
      colorA: "#111733",
      colorB: "#5d4fa8",
      colorC: "#8ee0ff"
    },
    {
      landscapePosition: [-24.4, 2.8, -58],
      portraitPosition: [-16.8, 4.2, -58],
      scale: [58, 20],
      opacity: 0.09,
      seed: 3.21,
      driftX: 0.09,
      driftY: 0.05,
      scrollInfluence: 0.09,
      rotationSpeed: 0.003,
      rotationRange: 0.012,
      additive: false,
      colorA: "#081225",
      colorB: "#294f8d",
      colorC: "#77bfe3"
    }
  ]
};

function cloneLayer(layer) {
  return {
    ...layer,
    landscapePosition: [...layer.landscapePosition],
    portraitPosition: [...layer.portraitPosition],
    scale: [...layer.scale]
  };
}

function mergeNebulaShaderConfig(overrides = {}) {
  return {
    ...DEFAULT_NEBULA_SHADER_CONFIG,
    ...overrides,
    layers: (overrides.layers || DEFAULT_NEBULA_SHADER_CONFIG.layers).map(cloneLayer)
  };
}

function createNebulaMaterial(THREE, layer, config, quality) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: layer.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: layer.opacity * config.nebulaIntensity * quality.glowStrength },
      uIntensity: { value: config.nebulaIntensity },
      uSpeed: { value: config.nebulaSpeed },
      uDepth: { value: config.nebulaDepth },
      uBandStrength: { value: config.bandStrength },
      uPulse: { value: 0 },
      uLighting: { value: 0 },
      uWarp: { value: 0 },
      uSeed: { value: layer.seed },
      uColorA: { value: new THREE.Color(layer.colorA) },
      uColorB: { value: new THREE.Color(layer.colorB) },
      uColorC: { value: new THREE.Color(layer.colorC) }
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;

      uniform float uTime;
      uniform float uOpacity;
      uniform float uIntensity;
      uniform float uSpeed;
      uniform float uDepth;
      uniform float uBandStrength;
      uniform float uPulse;
      uniform float uLighting;
      uniform float uWarp;
      uniform float uSeed;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;

      float hash(vec2 p) {
        return fract(sin(dot(p + uSeed, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);

        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.52;

        value += amplitude * noise(p);
        p = p * 1.92 + vec2(17.4, 9.1);
        amplitude *= 0.5;

        value += amplitude * noise(p);
        p = p * 2.04 + vec2(-13.8, 11.7);
        amplitude *= 0.52;

        value += amplitude * noise(p);
        return value;
      }

      void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        uv.x *= 1.3;

        float t = uTime * uSpeed;
        vec2 macroFlow = uv * (0.74 + uDepth * 0.06);
        macroFlow += vec2(t * 0.026 + uSeed * 0.4, -t * 0.016 + uSeed * 0.22);

        vec2 flow = uv * 1.28;
        flow += vec2(t * 0.08 + uSeed * 0.7, -t * 0.042 + uSeed * 0.3);

        vec2 warpField = vec2(
          fbm(flow * 0.42 + vec2(-t * 0.03, uSeed * 1.7)),
          fbm(flow * 0.37 + vec2(uSeed * 1.3, t * 0.024))
        ) - 0.5;
        vec2 secondaryWarp = vec2(
          fbm(macroFlow * 0.34 + vec2(uSeed * 0.6, -t * 0.012)),
          fbm(macroFlow * 0.28 + vec2(t * 0.01, uSeed * 0.9))
        ) - 0.5;
        flow += warpField * 0.34 + secondaryWarp * 0.18;

        float base = fbm(flow);
        float detail = fbm(flow * 1.66 + vec2(t * 0.036, -t * 0.024));
        float mist = fbm(flow * 0.72 + vec2(t * 0.014, -t * 0.012));
        float macro = fbm(macroFlow + secondaryWarp * 0.12);
        float band = smoothstep(0.08, 0.96, 1.0 - abs(uv.y * 0.58 + base * 0.12 + detail * 0.05));
        float galacticBand = 1.0 - smoothstep(
          0.08,
          0.82,
          abs(uv.y * 0.64 + uv.x * 0.26 + mist * 0.18 - detail * 0.08 + macro * 0.1)
        );
        float secondaryBand = 1.0 - smoothstep(
          0.1,
          0.9,
          abs(uv.y * 0.42 - uv.x * 0.22 + macro * 0.14 - mist * 0.06)
        );
        float dustLane = smoothstep(0.3, 0.84, fbm(flow * 0.58 + vec2(-t * 0.01, t * 0.008)));
        float dustCut = smoothstep(0.26, 0.78, fbm(macroFlow * 0.62 + vec2(t * 0.008, -t * 0.006)));
        float filaments = smoothstep(0.42, 0.86, fbm(flow * 1.08 + vec2(t * 0.02, -t * 0.014)));
        float halo = smoothstep(0.34, 0.92, macro + detail * 0.18);
        float edge = 1.0 - smoothstep(0.12, 1.18, length(uv));
        float density =
          clamp(base * 0.48 + detail * 0.22 + mist * 0.14 + macro * 0.12, 0.0, 1.0) *
          band *
          edge;
        density = clamp(
          density +
          galacticBand * dustLane * uBandStrength * 0.34 +
          secondaryBand * dustCut * uBandStrength * 0.18 +
          filaments * galacticBand * 0.08 * uDepth +
          halo * 0.06 * uDepth,
          0.0,
          1.0
        );

        vec3 color = mix(uColorA, uColorB, smoothstep(0.18, 0.7, density));
        color = mix(color, uColorC, smoothstep(0.62, 1.0, detail + base * 0.22));
        color = mix(color, mix(uColorB, uColorC, 0.38), galacticBand * uBandStrength * 0.18);
        color = mix(color, mix(uColorA, uColorC, 0.52), secondaryBand * 0.08 + uLighting * 0.04);

        float alpha =
          density *
          uOpacity *
          (1.08 + uPulse * 0.08 + uLighting * 0.06) *
          (1.0 - uWarp * 0.05);

        gl_FragColor = vec4(
          color * (uIntensity * (0.74 + density * 0.3 + galacticBand * 0.12 + secondaryBand * 0.05 + halo * 0.04)),
          alpha
        );
      }
    `
  });
}

export function createNebulaShader({ THREE, quality, viewport, config = {} }) {
  const nebulaConfig = mergeNebulaShaderConfig(config);
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  const targetLayerCount = quality.name === "low" ? 2 : quality.name === "medium" ? 5 : 6;
  const activeLayerCount = Math.max(
    1,
    Math.min(nebulaConfig.layers.length, Math.round(targetLayerCount * nebulaConfig.particleDensity))
  );
  const layers = nebulaConfig.layers.slice(0, activeLayerCount).map((layer, index) => {
    const material = createNebulaMaterial(THREE, layer, nebulaConfig, quality);
    const mesh = new THREE.Mesh(geometry, material);
    const uniforms = material.uniforms;

    mesh.frustumCulled = false;
    mesh.renderOrder = -18 + index;

    return {
      layer,
      material,
      uniforms,
      mesh,
      phase: index * 0.91 + layer.seed * 2.1,
      driftPhaseX: layer.seed * 3.7 + index * 0.43,
      driftPhaseY: layer.seed * 5.1 + index * 0.29,
      flowRateA: 0.74 + (layer.seed % 0.34),
      flowRateB: 0.4 + (layer.seed % 0.18),
      opacityPhase: layer.seed * 2.8 + index * 0.61,
      rotationPhase: layer.seed * 4.4 + index * 0.33,
      scalePhase: layer.seed * 3.3 + index * 0.42,
      cameraInfluenceX: 0.05 + layer.scrollInfluence * 0.16,
      cameraInfluenceY: 0.03 + layer.scrollInfluence * 0.11,
      blackHoleInfluenceX: 0.06 + index * 0.02,
      blackHoleInfluenceY: 0.03 + index * 0.015,
      smoothing: 0.56 + (layer.seed % 0.18),
      currentX: 0,
      currentY: 0,
      currentRotation: 0,
      currentOpacity: material.uniforms.uOpacity.value,
      anchorX: 0,
      anchorY: 0,
      anchorZ: 0,
      baseScaleX: 1,
      baseScaleY: 1
    };
  });

  for (let index = 0; index < layers.length; index += 1) {
    group.add(layers[index].mesh);
  }

  function init(scene) {
    if (scene && group.parent !== scene) {
      scene.add(group);
    }
  }

  function resize(nextViewport = viewport) {
    const portrait = nextViewport.height > nextViewport.width;
    const compact = nextViewport.width < 900 || nextViewport.height < 720;
    const scaleFactor = (portrait ? 0.92 : compact ? 0.96 : 1) * (0.94 + nebulaConfig.nebulaDepth * 0.08);

    for (let index = 0; index < layers.length; index += 1) {
      const entry = layers[index];
      const anchor = portrait ? entry.layer.portraitPosition : entry.layer.landscapePosition;

      entry.anchorX = anchor[0];
      entry.anchorY = anchor[1];
      entry.anchorZ = anchor[2];
      entry.baseScaleX = entry.layer.scale[0] * scaleFactor;
      entry.baseScaleY = entry.layer.scale[1] * scaleFactor;
      entry.mesh.position.set(entry.anchorX, entry.anchorY, entry.anchorZ);
      entry.mesh.scale.set(entry.baseScaleX, entry.baseScaleY, 1);
      entry.currentX = entry.anchorX;
      entry.currentY = entry.anchorY;
      entry.currentRotation = 0;
    }
  }

  resize(viewport);

  function update(frame) {
    const lightingStrength = frame.lightingPulse?.strength || 0;
    const warpStrength = frame.warp?.strength || 0;
    const scrollOffset = (frame.scrollProgress - 0.5) * 2;
    const scrollMagnitude = Math.abs(scrollOffset);
    const cameraDriftX = frame.camera?.driftX || 0;
    const cameraDriftY = frame.camera?.driftY || 0;
    const blackHole = frame.blackHole;
    const blackHolePull = blackHole?.pull || 0;
    const blackHoleShiftX = blackHole ? (blackHole.position.x * 0.018) * blackHolePull : 0;
    const blackHoleShiftY = blackHole ? (blackHole.position.y * 0.01) * blackHolePull : 0;

    for (let index = 0; index < layers.length; index += 1) {
      const entry = layers[index];
      const alpha = frame.delta > 0 ? Math.min(1, frame.delta * entry.smoothing) : 1;
      const time = frame.elapsed + entry.phase * 1.7;
      const pulse =
        1 +
        Math.sin(frame.elapsed * 0.017 + entry.opacityPhase) * 0.024 +
        Math.cos(frame.elapsed * 0.007 + entry.opacityPhase * 0.63) * 0.012;
      const targetX =
        entry.anchorX +
        Math.sin(time * nebulaConfig.nebulaSpeed * entry.flowRateA + entry.driftPhaseX) * entry.layer.driftX * 0.7 +
        Math.cos(time * nebulaConfig.nebulaSpeed * entry.flowRateB + entry.phase) * entry.layer.driftX * 0.24 +
        Math.sin(time * nebulaConfig.nebulaSpeed * 0.12 + entry.driftPhaseY) * entry.layer.driftX * 0.12 +
        scrollOffset * entry.layer.scrollInfluence +
        cameraDriftX * entry.cameraInfluenceX +
        blackHoleShiftX * entry.blackHoleInfluenceX;
      const targetY =
        entry.anchorY +
        Math.cos(time * nebulaConfig.nebulaSpeed * (0.52 + entry.flowRateB * 0.16) + entry.driftPhaseY) * entry.layer.driftY * 0.72 +
        Math.sin(time * nebulaConfig.nebulaSpeed * 0.22 + entry.phase * 0.8) * entry.layer.driftY * 0.18 +
        Math.cos(time * nebulaConfig.nebulaSpeed * 0.1 + entry.driftPhaseX) * entry.layer.driftY * 0.08 +
        cameraDriftY * entry.cameraInfluenceY +
        blackHoleShiftY * entry.blackHoleInfluenceY;
      const targetRotation =
        Math.sin(frame.elapsed * entry.layer.rotationSpeed * 0.72 + entry.rotationPhase) * entry.layer.rotationRange * 0.82 +
        Math.cos(frame.elapsed * entry.layer.rotationSpeed * 0.29 + entry.rotationPhase * 0.7) * entry.layer.rotationRange * 0.18;
      const targetOpacity =
        entry.layer.opacity *
        nebulaConfig.nebulaIntensity *
        quality.glowStrength *
        nebulaConfig.nebulaDepth *
        pulse *
        (1.14 + lightingStrength * 0.1 + scrollMagnitude * 0.03 + blackHolePull * 0.08) *
        (1 - warpStrength * 0.06);
      const scalePulse =
        1 +
        Math.sin(frame.elapsed * 0.006 + entry.scalePhase) * 0.02 +
        lightingStrength * 0.012 +
        blackHolePull * 0.01;

      entry.currentX = blend(entry.currentX, targetX, alpha);
      entry.currentY = blend(entry.currentY, targetY, alpha);
      entry.currentRotation = blend(entry.currentRotation, targetRotation, alpha);
      entry.currentOpacity = blend(entry.currentOpacity, targetOpacity, alpha);

      entry.mesh.position.x = entry.currentX;
      entry.mesh.position.y = entry.currentY;
      entry.mesh.rotation.z = entry.currentRotation;
      entry.mesh.scale.set(entry.baseScaleX * scalePulse, entry.baseScaleY * scalePulse, 1);
      entry.uniforms.uTime.value = frame.elapsed;
      entry.uniforms.uDepth.value = nebulaConfig.nebulaDepth;
      entry.uniforms.uBandStrength.value = nebulaConfig.bandStrength;
      entry.uniforms.uPulse.value = lightingStrength;
      entry.uniforms.uLighting.value = lightingStrength;
      entry.uniforms.uWarp.value = warpStrength;
      entry.uniforms.uOpacity.value = entry.currentOpacity;
    }
  }

  function destroy() {
    group.parent?.remove(group);

    for (let index = 0; index < layers.length; index += 1) {
      layers[index].material.dispose();
    }

    geometry.dispose();
  }

  return {
    config: nebulaConfig,
    destroy,
    init,
    object3d: group,
    resize,
    update
  };
}
