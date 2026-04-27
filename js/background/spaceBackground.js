import { createDisposer } from "../modules/lifecycle.js";
import { prefersReducedMotion, rafThrottle } from "../modules/utils.js";
import { createBackgroundThemeBridge } from "./backgroundThemeBridge.js";
import { createSpaceScene, getSpaceQualityProfile } from "./spaceScene.js?v=20260425-systemcursor";

const THREE_MODULE_URLS = [
  "../../assets/vendor/three/three.module.js?v=0.160.1"
];

const DEFAULT_SPACE_BACKGROUND_CONFIG = {
  blackHole: {
    blackHoleStrength: 0.46,
    particleDensity: 0.8
  },
  nebulaShader: {
    nebulaIntensity: 0.21,
    nebulaSpeed: 0.048,
    particleDensity: 0.92
  },
  galaxyCore: {
    galaxyRotationSpeed: 0.016,
    galaxySize: 0.94,
    particleDensity: 0.72
  },
  cameraController: {
    cameraDriftSpeed: 0.13,
    cameraZoomStrength: 0.14
  },
  warpSystem: {
    warpFrequency: { min: 26, max: 44 },
    warpSpeed: 0.94,
    particleDensity: 0.8
  },
  planets: {
    energyFieldStrength: 0.26,
    energyPulseSpeed: 0.14
  },
  lightingPulse: {
    lightingPulseIntensity: 0.082,
    energyPulseSpeed: 0.12
  }
};

let threeModulePromise = null;

function normalizeLegacyNebulaConfig(legacy = {}) {
  return {
    nebulaIntensity:
      typeof legacy.opacityMultiplier === "number"
        ? Math.max(0.12, Math.min(0.32, DEFAULT_SPACE_BACKGROUND_CONFIG.nebulaShader.nebulaIntensity * legacy.opacityMultiplier))
        : undefined,
    nebulaSpeed:
      typeof legacy.driftScale === "number"
        ? Math.max(0.02, Math.min(0.08, DEFAULT_SPACE_BACKGROUND_CONFIG.nebulaShader.nebulaSpeed * legacy.driftScale))
        : undefined,
    particleDensity:
      typeof legacy.layerLimit === "number"
        ? Math.max(0.45, Math.min(1, legacy.layerLimit / 4))
        : undefined
  };
}

function mergeBackgroundConfig(overrides = {}) {
  const legacyNebula = normalizeLegacyNebulaConfig(overrides.nebula);

  return {
    ...DEFAULT_SPACE_BACKGROUND_CONFIG,
    ...overrides,
    blackHole: {
      ...DEFAULT_SPACE_BACKGROUND_CONFIG.blackHole,
      ...overrides.blackHole
    },
    nebulaShader: {
      ...DEFAULT_SPACE_BACKGROUND_CONFIG.nebulaShader,
      ...legacyNebula,
      ...overrides.nebulaShader
    },
    galaxyCore: {
      ...DEFAULT_SPACE_BACKGROUND_CONFIG.galaxyCore,
      ...overrides.galaxyCore
    },
    cameraController: {
      ...DEFAULT_SPACE_BACKGROUND_CONFIG.cameraController,
      ...overrides.cameraController
    },
    warpSystem: {
      ...DEFAULT_SPACE_BACKGROUND_CONFIG.warpSystem,
      ...overrides.warpSystem,
      warpFrequency: {
        ...DEFAULT_SPACE_BACKGROUND_CONFIG.warpSystem.warpFrequency,
        ...overrides.warpSystem?.warpFrequency
      }
    },
    planets: {
      ...DEFAULT_SPACE_BACKGROUND_CONFIG.planets,
      ...overrides.planets
    },
    lightingPulse: {
      ...DEFAULT_SPACE_BACKGROUND_CONFIG.lightingPulse,
      ...overrides.lightingPulse
    }
  };
}

function computeScrollProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  return scrollable > 0 ? Math.max(0, Math.min(1, window.scrollY / scrollable)) : 0;
}

function getViewportState(canvas, reducedMotion, coarsePointer, scrollProgress = computeScrollProgress()) {
  return {
    width: Math.max(
      1,
      canvas?.clientWidth ||
        canvas?.parentElement?.clientWidth ||
        window.innerWidth ||
        document.documentElement.clientWidth ||
        1
    ),
    height: Math.max(
      1,
      canvas?.clientHeight ||
        canvas?.parentElement?.clientHeight ||
        window.innerHeight ||
        document.documentElement.clientHeight ||
        1
    ),
    dpr: window.devicePixelRatio || 1,
    coarsePointer,
    reducedMotion,
    scrollProgress
  };
}

function supportsWebGL() {
  try {
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2") || probe.getContext("webgl");
    if (!context) {
      return false;
    }

    const gl = context;
    gl.getExtension("WEBGL_lose_context")?.loseContext?.();
    return true;
  } catch (error) {
    return false;
  }
}

function createMediaQueryHandle(query) {
  if (typeof window.matchMedia === "function") {
    return window.matchMedia(query);
  }

  return {
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {}
  };
}

async function loadThreeModule() {
  if (threeModulePromise) {
    return threeModulePromise;
  }

  threeModulePromise = (async () => {
    let lastError = null;

    for (const url of THREE_MODULE_URLS) {
      try {
        return await import(url);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Three.js failed to load.");
  })();

  return threeModulePromise;
}

export function createSpaceBackgroundController(options = {}) {
  const cleanup = createDisposer();
  const themeBridge = createBackgroundThemeBridge();
  const canvas = document.getElementById("sceneCanvas");
  const shell = canvas?.closest(".scene-shell");
  const coarsePointerQuery = createMediaQueryHandle("(pointer: coarse)");
  const reducedMotionQuery = createMediaQueryHandle("(prefers-reduced-motion: reduce)");
  let reducedMotion = prefersReducedMotion();
  const config = mergeBackgroundConfig(options.config || {});
  let sceneController = null;
  let animationFrame = 0;
  let running = false;
  let destroyed = false;
  let visible = !document.hidden;
  let elapsed = 0;
  let lastTimestamp = 0;
  let threeModule = null;
  let scrollProgress = computeScrollProgress();
  const tickFrame = {
    elapsed: 0,
    delta: 0,
    scrollProgress
  };
  const staticFrame = {
    elapsed: 0,
    scrollProgress
  };

  if (!canvas || !shell) {
    return {
      destroy: () => {},
      reducedMotion
    };
  }

  function stop() {
    running = false;

    if (animationFrame) {
      cleanup.cancelRaf(animationFrame);
      animationFrame = 0;
    }
  }

  function renderStaticFrame() {
    if (!sceneController || !visible) {
      return;
    }

    staticFrame.elapsed = elapsed;
    staticFrame.scrollProgress = scrollProgress;
    sceneController.renderFrame(staticFrame);
  }

  function tick(timestamp) {
    if (!sceneController || !running) {
      return;
    }

    const delta = lastTimestamp ? Math.min(0.033, (timestamp - lastTimestamp) * 0.001) : 1 / 60;
    lastTimestamp = timestamp;
    elapsed += delta;

    tickFrame.elapsed = elapsed;
    tickFrame.delta = delta;
    tickFrame.scrollProgress = scrollProgress;
    sceneController.update(tickFrame);

    animationFrame = cleanup.raf(tick);
  }

  function start() {
    if (!sceneController || reducedMotion || !visible || running) {
      return;
    }

    running = true;
    lastTimestamp = 0;
    animationFrame = cleanup.raf(tick);
  }

  function rebuildScene() {
    if (!sceneController || !threeModule) {
      return;
    }

    stop();
    const previousScene = sceneController;

    try {
      sceneController = createSpaceScene({
        THREE: threeModule,
        canvas,
        viewport: getViewportState(canvas, reducedMotion, coarsePointerQuery.matches, scrollProgress),
        reducedMotion,
        config
      });
      previousScene.destroy();
      themeBridge.apply(sceneController.getQuality());
      renderStaticFrame();

      if (!reducedMotion && visible) {
        start();
      }
    } catch (error) {
      sceneController = previousScene;
      console.warn("Space background: quality rebuild skipped.", error);
      sceneController.resize(getViewportState(canvas, reducedMotion, coarsePointerQuery.matches, scrollProgress));
      renderStaticFrame();
      if (!reducedMotion && visible) {
        start();
      }
    }
  }

  function enterFallbackState(error) {
    if (error) {
      console.warn("Space background: using static fallback.", error);
    }

    stop();
    sceneController?.destroy();
    sceneController = null;
    threeModule = null;
    shell.dataset.backgroundState = "fallback";
  }

  const onResize = rafThrottle(() => {
    if (!sceneController) {
      return;
    }

    scrollProgress = computeScrollProgress();
    const nextViewport = getViewportState(canvas, reducedMotion, coarsePointerQuery.matches, scrollProgress);
    sceneController.resize(nextViewport);
    if (visible) {
      renderStaticFrame();
    }

    if (!reducedMotion && visible) {
      start();
    }
  });

  const onScroll = rafThrottle(() => {
    scrollProgress = computeScrollProgress();

    if (reducedMotion && visible) {
      renderStaticFrame();
    }
  });

  cleanup.add(() => onResize.cancel?.());
  cleanup.add(() => onScroll.cancel?.());
  cleanup.listen(window, "resize", onResize, { passive: true });
  cleanup.listen(window, "orientationchange", onResize, { passive: true });
  cleanup.listen(window, "scroll", onScroll, { passive: true });
  cleanup.listen(coarsePointerQuery, "change", onResize);
  cleanup.listen(reducedMotionQuery, "change", (event) => {
    reducedMotion = event.matches;

    if (!sceneController) {
      themeBridge.apply(
        getSpaceQualityProfile(
          getViewportState(canvas, reducedMotion, coarsePointerQuery.matches, scrollProgress),
          reducedMotion
        )
      );
      return;
    }

    rebuildScene();
  });
  cleanup.listen(document, "visibilitychange", () => {
    visible = !document.hidden;
    scrollProgress = computeScrollProgress();

    if (!sceneController) {
      return;
    }

    if (visible) {
      if (reducedMotion) {
        renderStaticFrame();
      } else {
        start();
      }
    } else {
      stop();
    }
  });

  scrollProgress = computeScrollProgress();
  themeBridge.apply(
    getSpaceQualityProfile(getViewportState(canvas, reducedMotion, coarsePointerQuery.matches, scrollProgress), reducedMotion)
  );

  shell.dataset.backgroundState = "loading";

  (async () => {
    if (!supportsWebGL()) {
      shell.dataset.backgroundState = "fallback";
      return;
    }

    try {
      const THREE = await loadThreeModule();
      threeModule = THREE;

      if (destroyed) {
        return;
      }

      sceneController = createSpaceScene({
        THREE,
        canvas,
        viewport: getViewportState(canvas, reducedMotion, coarsePointerQuery.matches, scrollProgress),
        reducedMotion,
        config
      });

      themeBridge.apply(sceneController.getQuality());
      shell.dataset.backgroundState = "ready";
      renderStaticFrame();

      if (!reducedMotion && visible) {
        start();
      }
    } catch (error) {
      enterFallbackState(error);
    }
  })();

  function destroy() {
    destroyed = true;
    stop();
    sceneController?.destroy();
    sceneController = null;
    threeModule = null;
    themeBridge.destroy();
    delete shell.dataset.backgroundState;
    cleanup.destroy();
  }

  return {
    destroy,
    reducedMotion
  };
}
