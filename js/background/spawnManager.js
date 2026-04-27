import { randomBetween } from "./motion.js";

export function createSpawnManager({ quality, ships, comets, asteroids }) {
  const canSpawnHeroes = quality.maxActiveHeroes > 0 && typeof ships?.spawnHero === "function";
  const canSpawnEnemies = quality.maxActiveEnemies > 0 && typeof ships?.spawnEnemy === "function";
  const canSpawnComets = quality.cometPoolSize > 0 && typeof comets?.spawn === "function";
  const canSpawnAsteroids = quality.maxActiveAsteroids > 0 && typeof asteroids?.spawn === "function";
  let heroTimer = 0;
  let enemyTimer = 0;
  let cometTimer = 0;
  let asteroidTimer = 0;
  let heroBias = randomBetween(0.88, 1.16);
  let enemyBias = randomBetween(0.82, 1.14);
  let cometBias = randomBetween(0.9, 1.22);
  let asteroidBias = randomBetween(0.84, 1.18);
  let skirmishCooldown = randomBetween(quality.skirmishInterval.min, quality.skirmishInterval.max);
  let skirmishTime = 0;

  function isSkirmishActive() {
    return skirmishTime > 0;
  }

  function resetHeroTimer() {
    heroBias = randomBetween(0.84, 1.22);
    heroTimer =
      randomBetween(quality.heroInterval.min, quality.heroInterval.max) *
      heroBias *
      (isSkirmishActive() ? randomBetween(0.72, 0.92) : randomBetween(0.94, 1.18));
  }

  function resetEnemyTimer() {
    enemyBias = randomBetween(0.8, 1.2);
    enemyTimer =
      randomBetween(quality.enemyInterval.min, quality.enemyInterval.max) *
      enemyBias *
      (isSkirmishActive() ? randomBetween(0.58, 0.84) : randomBetween(0.9, 1.18));
  }

  function resetCometTimer() {
    cometBias = randomBetween(0.88, 1.28);
    cometTimer =
      randomBetween(quality.cometInterval.min, quality.cometInterval.max) *
      cometBias *
      (isSkirmishActive() ? randomBetween(0.9, 1.06) : randomBetween(0.94, 1.16));
  }

  function resetAsteroidTimer() {
    asteroidBias = randomBetween(0.82, 1.22);
    asteroidTimer =
      randomBetween(quality.asteroidInterval.min, quality.asteroidInterval.max) *
      asteroidBias *
      (isSkirmishActive() ? randomBetween(0.82, 0.98) : randomBetween(0.92, 1.14));
  }

  function resetSkirmishCooldown() {
    skirmishCooldown =
      randomBetween(quality.skirmishInterval.min, quality.skirmishInterval.max) *
      randomBetween(0.9, 1.18);
  }

  function beginSkirmish() {
    skirmishTime =
      randomBetween(quality.skirmishDuration.min, quality.skirmishDuration.max) *
      randomBetween(0.92, 1.16);
    heroTimer = Math.min(heroTimer, randomBetween(0.9, 2.2));
    enemyTimer = Math.min(enemyTimer, randomBetween(0.34, 1.1));
  }

  function warmup() {
    for (let index = 0; canSpawnAsteroids && index < quality.initialAsteroids; index += 1) {
      if (!asteroids.spawn()) {
        break;
      }
    }

    for (let index = 0; canSpawnHeroes && index < quality.initialHeroes; index += 1) {
      if (!ships?.spawnHero?.()) {
        break;
      }
    }

    for (let index = 0; canSpawnEnemies && index < quality.initialEnemies; index += 1) {
      if (!ships?.spawnEnemy?.()) {
        break;
      }
    }

    heroTimer = canSpawnHeroes ? 0 : Number.POSITIVE_INFINITY;
    enemyTimer = canSpawnEnemies ? 0 : Number.POSITIVE_INFINITY;
    cometTimer = canSpawnComets ? 0 : Number.POSITIVE_INFINITY;
    asteroidTimer = canSpawnAsteroids ? 0 : Number.POSITIVE_INFINITY;

    if (canSpawnHeroes) {
      resetHeroTimer();
    }

    if (canSpawnEnemies) {
      resetEnemyTimer();
    }

    if (canSpawnComets) {
      resetCometTimer();
    }

    if (canSpawnAsteroids) {
      resetAsteroidTimer();
    }
  }

  function update(delta) {
    if (!canSpawnHeroes && !canSpawnEnemies && !canSpawnComets && !canSpawnAsteroids) {
      return;
    }

    if (isSkirmishActive()) {
      skirmishTime -= delta;

      if (skirmishTime <= 0) {
        skirmishTime = 0;
        resetSkirmishCooldown();
      }
    } else {
      skirmishCooldown -= delta;

      if (skirmishCooldown <= 0) {
        beginSkirmish();
      }
    }

    if (canSpawnHeroes) {
      heroTimer -= delta;
    }

    if (canSpawnEnemies) {
      enemyTimer -= delta;
    }

    if (canSpawnComets) {
      cometTimer -= delta;
    }

    if (canSpawnAsteroids) {
      asteroidTimer -= delta;
    }

    if (canSpawnHeroes && heroTimer <= 0) {
      ships?.spawnHero?.();
      resetHeroTimer();
    }

    if (canSpawnEnemies && enemyTimer <= 0) {
      ships?.spawnEnemy?.();
      resetEnemyTimer();
    }

    if (canSpawnComets && cometTimer <= 0) {
      comets.spawn();
      resetCometTimer();
    }

    if (canSpawnAsteroids && asteroidTimer <= 0) {
      asteroids.spawn();
      resetAsteroidTimer();
    }
  }

  function destroy() {}

  return {
    destroy,
    update,
    warmup
  };
}
