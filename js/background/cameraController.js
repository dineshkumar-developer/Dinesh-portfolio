import { blend } from "./motion.js";

const DEFAULT_CAMERA_CONTROLLER_CONFIG = {
  cameraDriftSpeed: 0.13,
  cameraZoomStrength: 0.14,
  cameraParallaxStrength: 1
};

function mergeCameraConfig(overrides = {}) {
  return {
    ...DEFAULT_CAMERA_CONTROLLER_CONFIG,
    ...overrides
  };
}

export function createCameraController({ camera, sceneRig, quality, config = {} }) {
  const cameraConfig = mergeCameraConfig(config);
  const motionScale = quality.name === "high" ? 1 : quality.name === "medium" ? 0.88 : 0.72;
  const parallaxStrength = cameraConfig.cameraParallaxStrength;
  const phaseA = Math.random() * Math.PI * 2;
  const phaseB = Math.random() * Math.PI * 2;
  const phaseC = Math.random() * Math.PI * 2;
  const phaseD = Math.random() * Math.PI * 2;
  const phaseE = Math.random() * Math.PI * 2;
  const phaseF = Math.random() * Math.PI * 2;
  const phaseG = Math.random() * Math.PI * 2;
  const phaseH = Math.random() * Math.PI * 2;
  const state = {
    driftX: 0,
    driftY: 0,
    zoom: 0,
    lookX: 0,
    lookY: 0,
    rigRotationX: 0,
    rigRotationY: 0,
    rigRotationZ: 0,
    rigDepth: 0
  };

  function init() {}

  function resize() {}

  function update(frame) {
    const warpStrength = frame.warp?.strength || 0;
    const lightingStrength = frame.lightingPulse?.strength || 0;
    const blackHole = frame.blackHole;
    const blackHolePull = blackHole?.pull || 0;
    const blackHoleSide = blackHole ? Math.sign(blackHole.position.x || -1) || -1 : -1;
    const scrollOffset = (frame.scrollProgress - 0.5) * 2;
    const t = frame.elapsed * cameraConfig.cameraDriftSpeed;
    const horizon =
      Math.sin(t * 0.18 + phaseA) * 0.42 +
      Math.sin(t * 0.064 + phaseB) * 0.19 +
      Math.cos(t * 0.021 + phaseC) * 0.08;
    const verticalBreath =
      Math.cos(t * 0.14 + phaseD) * 0.14 +
      Math.sin(t * 0.052 + phaseE) * 0.052 +
      Math.cos(t * 0.016 + phaseF) * 0.02;
    const targetDriftX =
      (horizon +
        scrollOffset * 0.24 +
        warpStrength * 0.08 +
        lightingStrength * 0.12 -
        blackHoleSide * blackHolePull * 0.82) *
      motionScale *
      parallaxStrength;
    const targetDriftY =
      (verticalBreath +
        scrollOffset * 0.04 +
        lightingStrength * 0.035 -
        blackHolePull * 0.12) *
      motionScale *
      parallaxStrength;
    const targetZoom =
      Math.sin(t * 0.03 + phaseB * 0.7) * cameraConfig.cameraZoomStrength * 0.18 +
      Math.cos(t * 0.011 + phaseE * 0.6) * cameraConfig.cameraZoomStrength * 0.08 +
      lightingStrength * 0.04 -
      warpStrength * 0.26 * motionScale -
      blackHolePull * 0.06;
    const targetRigRotationX =
      Math.sin(t * 0.018 + phaseG) * 0.015 +
      Math.cos(t * 0.006 + phaseD * 0.8) * 0.004 +
      lightingStrength * 0.014;
    const targetRigRotationY =
      Math.cos(t * 0.014 + phaseH) * 0.022 +
      Math.sin(t * 0.005 + phaseA * 0.6) * 0.005 +
      blackHoleSide * blackHolePull * 0.02;
    const targetRigRotationZ =
      Math.sin(t * 0.024 + phaseC) * 0.008 +
      Math.cos(t * 0.009 + phaseA * 0.8) * 0.003 +
      lightingStrength * 0.006;
    const targetRigDepth =
      Math.cos(t * 0.016 + phaseD) * 0.12 +
      Math.sin(t * 0.006 + phaseF * 0.7) * 0.04 -
      warpStrength * 0.28 * motionScale -
      blackHolePull * 0.12;
    const alpha = frame.delta > 0 ? Math.min(1, frame.delta * 0.96) : 1;

    state.driftX = blend(state.driftX, targetDriftX, alpha);
    state.driftY = blend(state.driftY, targetDriftY, alpha);
    state.zoom = blend(state.zoom, targetZoom, alpha);
    state.lookX = blend(state.lookX, state.driftX * 0.072, alpha);
    state.lookY = blend(state.lookY, state.driftY * 0.05, alpha);
    state.rigRotationX = blend(state.rigRotationX, targetRigRotationX, alpha);
    state.rigRotationY = blend(state.rigRotationY, targetRigRotationY, alpha);
    state.rigRotationZ = blend(state.rigRotationZ, targetRigRotationZ, alpha);
    state.rigDepth = blend(state.rigDepth, targetRigDepth, alpha);

    camera.position.x = state.driftX * 0.24;
    camera.position.y = state.driftY * 0.16;
    camera.position.z = 20 + state.zoom;
    camera.lookAt(state.lookX, state.lookY, -20);
    sceneRig.rotation.x = state.rigRotationX;
    sceneRig.rotation.y = state.rigRotationY;
    sceneRig.rotation.z = state.rigRotationZ;
    sceneRig.position.z = state.rigDepth;
  }

  function destroy() {}

  return {
    config: cameraConfig,
    destroy,
    getState: () => state,
    init,
    resize,
    update
  };
}
