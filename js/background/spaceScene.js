import { randomBetween } from "./motion.js";
import { createAsteroids } from "./asteroids.js";
import { createBlackHole } from "./blackHole.js";
import { createCameraController } from "./cameraController.js";
import { createComets } from "./comets.js";
import { createExplosions } from "./explosions.js";
import { createGalaxyCore } from "./galaxyCore.js";
import { createGlowTexture, createPlanetTexture, createStreakTexture } from "./fx.js";
import { createGameSystem } from "./gameSystem.js";
import { createLightingPulse } from "./lightingPulse.js";
import { createMeteors } from "./meteors.js";
import { createNebulaShader } from "./nebulaShader.js";
import { createPlanets } from "./planets.js";
import { createPlayerShip } from "./playerShip.js";
import { createSatellites } from "./satellites.js";
import { createShips } from "./ships.js";
import { createSpawnManager } from "./spawnManager.js";
import { createStarfield } from "./starfield.js";
import { createWarpSystem } from "./warpSystem.js";

function selectQuality(viewport, reducedMotion) {
  const coarsePointer = Boolean(viewport.coarsePointer);
  const compact = viewport.width < 900 || viewport.height < 720;

  if (reducedMotion) {
    return {
      name: "low",
      pixelRatio: 1,
      antialias: false,
      starCounts: { far: 280, mid: 150, near: 42 },
      glimmerCount: 3,
      cometPoolSize: 1,
      asteroidPoolSize: 8,
      maxActiveAsteroids: 3,
      shipPoolSize: 3,
      maxActiveHeroes: 0,
      maxActiveEnemies: 1,
      streakPoolSize: 2,
      enableTrails: false,
      secondaryPlanet: false,
      glowStrength: 0.42,
      fogDensity: 0.016,
      motionScale: 0.26,
      cometInterval: { min: 18, max: 30 },
      asteroidInterval: { min: 4.8, max: 7.6 },
      heroInterval: { min: 10, max: 16 },
      enemyInterval: { min: 6.6, max: 11.2 },
      skirmishInterval: { min: 18, max: 28 },
      skirmishDuration: { min: 3.6, max: 5.8 },
      attackInterval: { min: 7.6, max: 12.4 },
      initialAsteroids: 2,
      initialHeroes: 0,
      initialEnemies: 0
    };
  }

  if (coarsePointer || compact) {
    return {
      name: "medium",
      pixelRatio: 1.08,
      antialias: false,
      starCounts: { far: 540, mid: 320, near: 74 },
      glimmerCount: 5,
      cometPoolSize: 4,
      asteroidPoolSize: 18,
      maxActiveAsteroids: 7,
      shipPoolSize: 8,
      maxActiveHeroes: 3,
      maxActiveEnemies: 5,
      streakPoolSize: 5,
      enableTrails: false,
      secondaryPlanet: true,
      glowStrength: 0.62,
      fogDensity: 0.0136,
      motionScale: 0.48,
      cometInterval: { min: 8, max: 14 },
      asteroidInterval: { min: 2.2, max: 3.8 },
      heroInterval: { min: 5.2, max: 8.8 },
      enemyInterval: { min: 2.8, max: 5.2 },
      skirmishInterval: { min: 12, max: 20 },
      skirmishDuration: { min: 4.8, max: 7.4 },
      attackInterval: { min: 4.2, max: 7.2 },
      initialAsteroids: 4,
      initialHeroes: 2,
      initialEnemies: 3
    };
  }

  return {
    name: "high",
    pixelRatio: 1.35,
    antialias: true,
    starCounts: { far: 900, mid: 560, near: 132 },
    glimmerCount: 8,
    cometPoolSize: 6,
    asteroidPoolSize: 28,
    maxActiveAsteroids: 12,
    shipPoolSize: 14,
    maxActiveHeroes: 5,
    maxActiveEnemies: 8,
    streakPoolSize: 7,
    enableTrails: true,
    secondaryPlanet: true,
    glowStrength: 0.82,
    fogDensity: 0.0085,
    motionScale: 0.62,
    cometInterval: { min: 5.5, max: 10 },
    asteroidInterval: { min: 1.4, max: 2.6 },
    heroInterval: { min: 3.8, max: 6.4 },
    enemyInterval: { min: 1.8, max: 3.4 },
    skirmishInterval: { min: 10, max: 17 },
    skirmishDuration: { min: 6, max: 9.2 },
    attackInterval: { min: 2.8, max: 5.2 },
    initialAsteroids: 7,
    initialHeroes: 3,
    initialEnemies: 5
  };
}

export function getSpaceQualityProfile(viewport, reducedMotion = false) {
  return selectQuality(viewport, reducedMotion);
}

function disposeTextures(textures) {
  Object.values(textures).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => entry?.dispose?.());
      return;
    }

    value?.dispose?.();
  });
}

function getClampedPixelRatio(viewport, quality) {
  const dpr = viewport?.dpr || 1;
  return Math.max(1, Math.min(dpr, quality.pixelRatio));
}

export function createSpaceScene({ THREE, canvas, viewport, reducedMotion = false, config = {} }) {
  const quality = selectQuality(viewport, reducedMotion);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality.antialias,
    alpha: false,
    powerPreference: "high-performance"
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, Math.max(1, viewport.width / Math.max(1, viewport.height)), 0.1, 180);
  const sceneRig = new THREE.Group();
  const ambientLight = new THREE.AmbientLight(0x8ea3c8, 0.56);
  const keyLight = new THREE.DirectionalLight(0x7db8ff, 0.94);
  const rimLight = new THREE.DirectionalLight(0xa4b6d7, 0.28);
  const textures = {
    glow: createGlowTexture(THREE, {
      size: 192,
      innerColor: "rgba(255,255,255,1)",
      midColor: "rgba(141,210,255,0.28)",
      outerColor: "rgba(0,0,0,0)"
    }),
    star: createGlowTexture(THREE, {
      size: 128,
      innerColor: "rgba(255,255,255,1)",
      midColor: "rgba(255,255,255,0.18)",
      outerColor: "rgba(0,0,0,0)"
    }),
    cometTail: createStreakTexture(THREE, {
      width: 960,
      height: 64,
      color: "rgba(118,214,255,0.52)",
      accent: "rgba(255,255,255,0.84)"
    }),
    shipTrail: createStreakTexture(THREE, {
      width: 640,
      height: 56,
      color: "rgba(138,224,255,0.42)",
      accent: "rgba(255,255,255,0.66)"
    }),
    attack: createStreakTexture(THREE, {
      width: 720,
      height: 44,
      color: "rgba(255,181,132,0.48)",
      accent: "rgba(255,245,234,0.84)"
    }),
    primaryPlanet: createPlanetTexture(THREE, {
      size: 1024,
      seed: 7,
      palette: {
        shadow: "#06101b",
        base: "#13304e",
        mid: "#2e5f8e",
        detail: "#87d8ea",
        accent: "#e0a673"
      }
    }),
    secondaryPlanet: createPlanetTexture(THREE, {
      size: 768,
      seed: 13,
      palette: {
        shadow: "#120d17",
        base: "#413454",
        mid: "#6a5f8d",
        detail: "#d7d2f5",
        accent: "#f5c18d"
      }
    })
  };

  const nebula = createNebulaShader({ THREE, quality, viewport, config: config.nebulaShader || config.nebula });
  const galaxyCore = createGalaxyCore({ THREE, quality, textures, viewport, config: config.galaxyCore });
  const starfield = createStarfield({ THREE, quality, textures });
  const blackHole = createBlackHole({ THREE, quality, textures, viewport, config: config.blackHole });
  const warpSystem = createWarpSystem({ THREE, quality, config: config.warpSystem });
  const planets = createPlanets({ THREE, quality, textures, viewport, config: config.planets });
  const satellites = createSatellites({ THREE, quality, textures });
  const ships = createShips({ THREE, quality, textures });
  const asteroids = createAsteroids({ THREE, quality });
  const comets = createComets({ THREE, quality, textures });
  const explosions = createExplosions({ THREE, quality, textures });
  const meteors = createMeteors({ THREE, quality, textures });
  const lightingPulse = createLightingPulse({
    THREE,
    quality,
    textures,
    ambientLight,
    keyLight,
    rimLight,
    viewport,
    config: config.lightingPulse
  });
  const cameraController = createCameraController({
    camera,
    sceneRig,
    quality,
    config: config.cameraController
  });
  const spawnManager = createSpawnManager({ quality, ships, comets, asteroids });

  // ── Player ship — created eagerly so idle animation runs from the start ──
  const playerShip = createPlayerShip({ THREE, quality, textures, canvas });

  // ── Game system — lazy-created on first game mode entry (needs hud ref) ──
  let gameSystem  = null;
  let gameHUDRef  = null;
  let gameModeOn  = false;
  let autoCombatTimer = randomBetween(4, 8);

  function ensureGameSystems(hud) {
    if (gameSystem) return;
    gameHUDRef = hud;
    gameSystem = createGameSystem({ quality, playerShip, ships, asteroids, meteors, explosions, hud });
  }

  scene.background = new THREE.Color("#02050d");
  scene.fog = new THREE.FogExp2(0x02050d, quality.fogDensity);
  camera.position.set(0, 0, 20);
  keyLight.position.set(8, 6, 16);
  rimLight.position.set(-10, -3, 8);

  scene.add(sceneRig, ambientLight, keyLight, rimLight);
  nebula.init(sceneRig);
  galaxyCore.init(sceneRig);
  sceneRig.add(starfield.object3d);
  blackHole.init(sceneRig);
  warpSystem.init(sceneRig);
  planets.init(sceneRig);
  lightingPulse.init(sceneRig);
  sceneRig.add(satellites.object3d, ships.object3d, asteroids.object3d, comets.object3d, meteors.object3d, explosions.object3d);
  scene.add(playerShip.object3d);
  cameraController.init(sceneRig);
  spawnManager.warmup();

  renderer.setPixelRatio(getClampedPixelRatio(viewport, quality));
  renderer.setSize(viewport.width, viewport.height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  let lastScrollProgress = viewport.scrollProgress || 0;
  const cameraFrame = {
    elapsed: 0,
    delta: 0,
    scrollProgress: lastScrollProgress,
    blackHole: null,
    lightingPulse: null,
    warp: null
  };
  const frameState = {
    elapsed: 0,
    delta: 0,
    scrollProgress: lastScrollProgress,
    driftX: 0,
    driftY: 0,
    blackHole: null,
    lightingPulse: null,
    warp: null,
    camera: null
  };
  const staticFrame = {
    elapsed: 0,
    delta: 0,
    scrollProgress: lastScrollProgress
  };

  function renderScene() {
    renderer.render(scene, camera);
  }

  function advance(frame, animate = true) {
    lastScrollProgress = typeof frame.scrollProgress === "number" ? frame.scrollProgress : lastScrollProgress;
    lightingPulse.update(frame);
    warpSystem.update(frame);
    const lightingState = lightingPulse.getState();
    const warpState = warpSystem.getState();

    frameState.elapsed = frame.elapsed;
    frameState.delta = frame.delta;
    frameState.scrollProgress = lastScrollProgress;
    frameState.lightingPulse = lightingState;
    frameState.warp = warpState;

    blackHole.update(frameState);
    const blackHoleState = blackHole.getState();

    cameraFrame.elapsed = frame.elapsed;
    cameraFrame.delta = frame.delta;
    cameraFrame.scrollProgress = lastScrollProgress;
    cameraFrame.blackHole = blackHoleState;
    cameraFrame.lightingPulse = lightingState;
    cameraFrame.warp = warpState;
    cameraController.update(cameraFrame);

    const cameraState = cameraController.getState();

    frameState.driftX = cameraState.driftX;
    frameState.driftY = cameraState.driftY;
    frameState.blackHole = blackHoleState;
    frameState.camera = cameraState;

    renderer.toneMappingExposure =
      1.12 +
      lightingState.strength * 0.048 +
      warpState.strength * 0.028 +
      Math.max(0, blackHoleState.strength - 0.38) * 0.038;

    galaxyCore.update(frameState);
    nebula.update(frameState);
    starfield.update(frameState);
    planets.update(frameState);

    if (animate && !reducedMotion) {
      spawnManager.update(frame.delta);
    }

    satellites.update(frameState);
    ships.update(frameState);
    asteroids.update(frameState);
    comets.update(frameState);
    meteors.update(frameState);
    explosions.update(frame.delta);

    // Player ship always updates (idle AI when not in game mode, player control when active)
    playerShip.update(frameState);
    if (gameModeOn && gameSystem) {
      gameSystem.update(frameState);
    } else {
      // Always-on auto-combat — runs as background animation regardless of game mode
      // Pass all positions; playerShip.setAutoTargets filters to enemies internally
      const allShipPositions = ships.getActivePositions?.() || [];
      playerShip.setAutoTargets?.(allShipPositions);

      // Enemy ships periodically fire attack streaks at the player ship
      autoCombatTimer -= frame.delta;
      if (autoCombatTimer <= 0 && ships.triggerAttackOnPlayer) {
        const ps = playerShip.getState();
        ships.triggerAttackOnPlayer({ x: ps.posX, y: ps.posY, z: playerShip.getZ() });
        autoCombatTimer = randomBetween(3, 7);
      }

      // Player auto-shots vs enemy ships → explosion on hit
      const shots = playerShip.getShots();
      if (shots.length && allShipPositions.length) {
        const R = 1.15 * 1.15;
        for (let si = shots.length - 1; si >= 0; si--) {
          const s = shots[si];
          if (!s.active) continue;
          for (const sp of allShipPositions) {
            const dx = s.grp.position.x - sp.x, dy = s.grp.position.y - sp.y;
            if (dx * dx + dy * dy < R) {
              s.active = false; s.grp.visible = false; shots.splice(si, 1);
              explosions.spawn(sp.x, sp.y, sp.z, "ship");
              ships.killShipAt?.(sp.id);
              break;
            }
          }
        }
      }

      // Enemy attack streaks hit player ship → visual-only spark + shake
      if (ships.getActiveStreaks) {
        const ps = playerShip.getState();
        if (!ps.invincible) {
          for (const streak of ships.getActiveStreaks()) {
            const dx = ps.posX - streak.x, dy = ps.posY - streak.y;
            if (dx * dx + dy * dy < 0.72 * 0.72) {
              playerShip.takeDamage(18);
              explosions.spawn(ps.posX, ps.posY, playerShip.getZ(), "spark");
              break;
            }
          }
        }
      }
    }

    renderScene();
  }

  function resize(nextViewport) {
    camera.aspect = Math.max(1, nextViewport.width / Math.max(1, nextViewport.height));
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(getClampedPixelRatio(nextViewport, quality));
    renderer.setSize(nextViewport.width, nextViewport.height, false);
    nebula.resize(nextViewport);
    galaxyCore.resize(nextViewport);
    blackHole.resize(nextViewport);
    planets.resize(nextViewport);
    lightingPulse.resize(nextViewport);
    cameraController.resize(nextViewport);
  }

  function enterGameMode(hud) {
    ensureGameSystems(hud);
    gameModeOn = true;
    gameSystem.start();
  }

  function exitGameMode() {
    gameModeOn = false;
    playerShip.deactivate();
    gameHUDRef?.hide();
  }

  function restartGame() {
    if (gameModeOn && gameSystem) gameSystem.restart();
  }

  function destroy() {
    playerShip.destroy();
    explosions.destroy();
    meteors.destroy();
    nebula.destroy();
    galaxyCore.destroy();
    starfield.destroy();
    blackHole.destroy();
    warpSystem.destroy();
    planets.destroy();
    satellites.destroy();
    ships.destroy();
    asteroids.destroy();
    comets.destroy();
    lightingPulse.destroy();
    cameraController.destroy();
    spawnManager.destroy();
    sceneRig.clear();
    scene.clear();
    disposeTextures(textures);
    renderer.renderLists?.dispose?.();
    renderer.setRenderTarget?.(null);
    renderer.setAnimationLoop?.(null);
    renderer.dispose();

    // Keep the canvas backing store intact so a quality rebuild can create a
    // fresh renderer on the same canvas without racing WebGL context teardown.
  }

  return {
    destroy,
    enterGameMode,
    exitGameMode,
    restartGame,
    isGameMode: () => gameModeOn,
    getGameState: () => gameSystem?.getState() ?? "IDLE",
    getQuality: () => quality,
    renderFrame: (frame) => {
      staticFrame.elapsed = frame.elapsed || 0;
      staticFrame.delta = 0;
      staticFrame.scrollProgress =
        typeof frame.scrollProgress === "number" ? frame.scrollProgress : lastScrollProgress;
      advance(staticFrame, false);
    },
    resize,
    update: advance
  };
}
