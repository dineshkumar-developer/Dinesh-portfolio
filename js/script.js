import { createDisposer } from "./modules/lifecycle.js";

const THEME_STORAGE_KEY = "portfolio-theme";
const MODULE_VERSION = "20260425-systemcursor";
const THEMES = {
  aurora: {
    label: "Aurora",
    next: "space",
    stylesheet: "./css/themes/aurora.css",
    color: "#fdfcfa"
  },
  space: {
    label: "Space",
    next: "aurora",
    stylesheet: "./css/themes/space.css",
    color: "#0a0e1a"
  }
};

const SPACE_BACKGROUND_CONFIG = {
  nebulaShader: {
    nebulaIntensity: 0.52,
    nebulaSpeed: 0.044,
    nebulaDepth: 1.62,
    bandStrength: 0.92,
    particleDensity: 1
  },
  blackHole: {
    blackHoleStrength: 0.72,
    particleDensity: 1,
    landscapePosition: [-21.8, 4.2, -25.8],
    portraitPosition: [-15.2, 6.2, -26.2],
    influenceRadius: 14,
    coreRadius: { low: 2.2, medium: 3.1, high: 3.9 },
    diskOuterScale: 3.24,
    ringGlowScale: 5.2
  },
  galaxyCore: {
    galaxyRotationSpeed: 0.034,
    galaxySize: 1.92,
    particleDensity: 1,
    landscapePosition: [-17.6, -3.8, -28.8],
    portraitPosition: [-12.6, -1.4, -29]
  },
  planets: {
    energyFieldStrength: 0.36,
    energyPulseSpeed: 0.1,
    main: {
      radius: { low: 5.2, medium: 6.2, high: 7 },
      landscapePosition: [18.2, -4.2, -15.2],
      portraitPosition: [14, -5.8, -15.8],
      emissiveIntensity: 0.128,
      atmosphereOpacity: 0.36,
      rimOpacity: 0.24,
      hazeOpacity: 0.104,
      hazeScale: 5.8,
      energyFieldOpacity: 0.118,
      rotationSpeed: 0.024,
      orbitSpeed: 0.016,
      driftSpeed: 0.032,
      driftAmplitudeX: 0.42,
      driftAmplitudeY: 0.26,
      depthDrift: 0.42,
      cameraParallax: 0.3
    },
    secondary: {
      radius: { low: 2.4, medium: 3, high: 3.55 },
      landscapePosition: [-12.4, 8.4, -22.8],
      portraitPosition: [-10.2, 9.2, -23.4],
      atmosphereOpacity: 0.22,
      rimOpacity: 0.17,
      hazeOpacity: 0.072,
      hazeScale: 5,
      rotationSpeed: -0.013,
      orbitSpeed: 0.011,
      driftSpeed: 0.028,
      depthDrift: 0.22,
      opacity: 0.92
    }
  },
  cameraController: {
    cameraDriftSpeed: 0.094,
    cameraZoomStrength: 0.078,
    cameraParallaxStrength: 1.36
  },
  warpSystem: {
    warpFrequency: { min: 5, max: 11 },
    warpSpeed: 0.34,
    streakIntensity: 1.56,
    particleDensity: 1,
    duration: { min: 3.2, max: 5.6 }
  },
  lightingPulse: {
    lightingPulseIntensity: 0.11,
    energyPulseSpeed: 0.072,
    impactChance: 0.76,
    interval: { min: 5, max: 12 },
    duration: { min: 5.8, max: 10.2 }
  }
};

const cleanup = createDisposer();
const controllers = [];
const activeTheme = getStoredTheme();

applyThemeState(activeTheme);
boot(activeTheme);

async function boot(theme) {
  createThemeSwitcher(theme);

  if (theme === "space") {
    await bootSpaceTheme();
  } else {
    await bootAuroraTheme();
  }
}

async function bootAuroraTheme() {
  await waitForGsap(1200);

  const [
    { createAuroraBackgroundController },
    { createParticlesController },
    { createGsapScenes },
    { createAmbientController },
    { createFuturisticUIController }
  ] = await Promise.all([
    import(`./background/auroraBackground.js?v=${MODULE_VERSION}`),
    import(`./modules/particles.js?v=${MODULE_VERSION}`),
    import(`./modules/gsapScenes.js?v=${MODULE_VERSION}`),
    import(`./modules/ambient.js?v=${MODULE_VERSION}`),
    import(`./modules/futuristicUI.js?v=${MODULE_VERSION}`)
  ]);

  if (cleanup.isDestroyed()) return;

  controllers.push(createAuroraBackgroundController());
  controllers.push(createParticlesController());
  controllers.push(createAmbientController());
  controllers.push(createFuturisticUIController());
  if (document.querySelector(".hero")) {
    controllers.push(createGsapScenes());
  }
}

async function bootSpaceTheme() {
  const [
    { createSpaceBackgroundController },
    { createAmbientController },
    { createFuturisticUIController }
  ] = await Promise.all([
    import(`./background/spaceBackground.js?v=${MODULE_VERSION}`),
    import(`./modules/ambientSpace.js?v=${MODULE_VERSION}`),
    import(`./modules/futuristicUISpace.js?v=${MODULE_VERSION}`)
  ]);

  if (cleanup.isDestroyed()) return;

  controllers.push(
    createSpaceBackgroundController({
      config: SPACE_BACKGROUND_CONFIG
    })
  );
  controllers.push(createAmbientController());
  controllers.push(createFuturisticUIController());
}

function getStoredTheme() {
  try {
    const theme =
      window.__PORTFOLIO_THEME__ ||
      window.localStorage.getItem(THEME_STORAGE_KEY) ||
      "aurora";
    return theme in THEMES ? theme : "aurora";
  } catch (error) {
    return "aurora";
  }
}

function applyThemeState(theme) {
  const config = THEMES[theme] || THEMES.aurora;
  document.documentElement.dataset.portfolioTheme = theme;
  document.body?.classList.toggle("theme-space", theme === "space");
  document.body?.classList.toggle("theme-aurora", theme === "aurora");

  document.querySelector("meta[name='theme-color']")?.setAttribute("content", config.color);
  document.getElementById("sceneCanvas")?.toggleAttribute("hidden", theme !== "space");
  document.getElementById("particlesCanvas")?.toggleAttribute("hidden", theme !== "aurora");
}

function createThemeSwitcher(theme) {
  const button = document.querySelector("[data-theme-switch]");
  if (!button) return;

  updateThemeButton(button, theme);

  cleanup.listen(button, "click", () => {
    const nextTheme = THEMES[theme]?.next || "aurora";
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      // Storage can be blocked in private contexts; a reload still applies the default.
    }
    window.location.reload();
  });
}

function updateThemeButton(button, theme) {
  const nextTheme = THEMES[theme]?.next || "aurora";
  const currentLabel = THEMES[theme]?.label || "Aurora";
  const nextLabel = THEMES[nextTheme]?.label || "Aurora";
  button.dataset.activeTheme = theme;
  button.setAttribute("aria-label", `Switch to ${nextLabel} theme`);
  button.setAttribute("title", `Switch to ${nextLabel} theme`);
  button.querySelector("[data-theme-current]")?.replaceChildren(document.createTextNode(currentLabel));
  button.querySelector("[data-theme-next]")?.replaceChildren(document.createTextNode(nextLabel));
}

function waitForGsap(timeoutMs) {
  return new Promise((resolve) => {
    if (window.gsap) return resolve();

    const start = performance.now();
    const tick = () => {
      if (window.gsap) return resolve();
      if (performance.now() - start >= timeoutMs) return resolve();
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}

let destroyed = false;
function destroyControllers() {
  if (destroyed) return;
  destroyed = true;

  for (let index = controllers.length - 1; index >= 0; index -= 1) {
    try {
      controllers[index]?.destroy?.();
    } catch (error) {
      console.warn("Portfolio bootstrap: controller cleanup failed.", error);
    }
  }

  controllers.length = 0;
  cleanup.destroy();
}

cleanup.listen(window, "pagehide", destroyControllers, { once: true });
cleanup.listen(window, "beforeunload", destroyControllers, { once: true });
