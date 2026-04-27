import { randomBetween } from "./motion.js";

const PUTYPE = ["shield", "rapidfire", "speed", "health"];

export function createGameSystem({ quality, playerShip, ships, asteroids, meteors, explosions, hud }) {
  let state      = "IDLE";   // IDLE | PLAYING | GAMEOVER
  let score      = 0;
  let combo      = 0;
  let comboTimer = 0;
  let kills      = 0;
  let puTimer    = randomBetween(12, 22);
  let enemyAttackTimer = randomBetween(3, 6);

  function getState() { return state; }

  function start() {
    state      = "PLAYING";
    score      = 0;
    combo      = 0;
    comboTimer = 0;
    kills      = 0;
    puTimer    = randomBetween(10, 20);
    enemyAttackTimer = randomBetween(3, 6);
    playerShip.activate();
    hud?.show();
    hud?.update({ score, combo, health: 100, shield: 0 });
  }

  function end() {
    state = "GAMEOVER";
    playerShip.deactivate();
    hud?.showGameOver(score, () => restart());
  }

  function restart() { start(); }

  // ── score ──
  function addScore(pts) {
    score      += pts * Math.max(1, combo);
    comboTimer  = 3.5;
    combo       = Math.min(combo + 1, 10);
    kills++;
    hud?.update({ score, combo, ...playerShip.getState() });
  }

  // ── collision helpers ──
  function sqDist2D(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  function checkShotsVsShips(shots, shipPositions) {
    const R = 1.15 * 1.15;
    for (let si = shots.length - 1; si >= 0; si--) {
      const s = shots[si];
      if (!s.active) continue;
      for (const sp of shipPositions) {
        if (sqDist2D(s.grp.position.x, s.grp.position.y, sp.x, sp.y) < R) {
          s.active = false; s.grp.visible = false; shots.splice(si, 1);
          explosions.spawn(sp.x, sp.y, sp.z, "ship");
          addScore(sp.kind === "enemy" ? 120 : 60);
          ships.killShipAt?.(sp.id);
          if (Math.random() < 0.18) {
            const type = PUTYPE[Math.floor(Math.random() * PUTYPE.length)];
            playerShip.spawnPowerUp(sp.x, sp.y, sp.z, type);
          }
          break;
        }
      }
    }
  }

  function checkShotsVsMeteors(shots) {
    if (!meteors?.getInteractivePositions) return;
    const mps = meteors.getInteractivePositions();
    for (let si = shots.length - 1; si >= 0; si--) {
      const s = shots[si];
      if (!s.active) continue;
      for (const mp of mps) {
        const R = (0.72 + mp.scale * 0.55) * (0.72 + mp.scale * 0.55);
        if (sqDist2D(s.grp.position.x, s.grp.position.y, mp.x, mp.y) < R) {
          s.active = false; s.grp.visible = false; shots.splice(si, 1);
          explosions.spawn(mp.x, mp.y, mp.z, "asteroid");
          addScore(35);
          meteors.killAt(mp.id);
          break;
        }
      }
    }
  }

  function checkAsteroidsVsPlayer(px, py) {
    if (!asteroids.getActivePositions) return false;
    const pState = playerShip.getState();
    if (pState.invincible) return false;
    const R = (0.7 + 1.1) * (0.7 + 1.1);
    for (const ap of asteroids.getActivePositions()) {
      if (Math.abs(ap.z - playerShip.getZ()) > 4) continue;
      if (sqDist2D(px, py, ap.x, ap.y) < R) {
        playerShip.takeDamage(22); // handles flash+shake+ripple internally
        explosions.spawn(ap.x, ap.y, ap.z, "asteroid");
        explosions.spawn(px, py, playerShip.getZ(), "spark");
        hud?.flashDamage();
        hud?.update({ score, combo, ...playerShip.getState() });
        return false; // ship never dies
      }
    }
    return false;
  }

  function checkMeteorsVsPlayer(px, py) {
    if (!meteors?.getInteractivePositions) return false;
    const pState = playerShip.getState();
    if (pState.invincible) return false;
    for (const mp of meteors.getInteractivePositions()) {
      if (Math.abs(mp.z - playerShip.getZ()) > 6) continue;
      const R = (0.7 + mp.scale * 0.52) * (0.7 + mp.scale * 0.52);
      if (sqDist2D(px, py, mp.x, mp.y) < R) {
        playerShip.takeDamage(20);
        explosions.spawn(mp.x, mp.y, mp.z, "asteroid");
        explosions.spawn(px, py, playerShip.getZ(), "spark");
        hud?.flashDamage();
        hud?.update({ score, combo, ...playerShip.getState() });
        meteors.killAt(mp.id);
        return false;
      }
    }
    return false;
  }

  function checkStreaksVsPlayer(px, py) {
    if (!ships.getActiveStreaks) return;
    const pState = playerShip.getState();
    if (pState.invincible) return;
    const R = 0.72 * 0.72;
    for (const streak of ships.getActiveStreaks()) {
      if (sqDist2D(px, py, streak.x, streak.y) < R) {
        playerShip.takeDamage(18);
        explosions.spawn(px, py, playerShip.getZ(), "spark");
        hud?.flashDamage();
        hud?.update({ score, combo, ...playerShip.getState() });
        break;
      }
    }
  }

  // ── update ──
  function update(frame) {
    if (state !== "PLAYING") return;

    const delta = frame.delta;
    comboTimer  = Math.max(0, comboTimer - delta);
    if (comboTimer <= 0 && combo > 0) {
      combo = Math.max(0, combo - 1);
      hud?.update({ score, combo, ...playerShip.getState() });
    }

    const ps = playerShip.getState();

    // Power-up timer
    puTimer -= delta;
    if (puTimer <= 0) {
      const B = playerShip.getBounds();
      const x = randomBetween(B.xMin * 0.7, B.xMax * 0.7);
      const y = randomBetween(B.yMin * 0.7, B.yMax * 0.7);
      playerShip.spawnPowerUp(x, y, playerShip.getZ(), PUTYPE[Math.floor(Math.random() * PUTYPE.length)]);
      puTimer = randomBetween(12, 22);
    }

    // Enemy fire at player — periodic targeted attacks
    enemyAttackTimer -= delta;
    if (enemyAttackTimer <= 0 && ships.triggerAttackOnPlayer) {
      ships.triggerAttackOnPlayer({ x: ps.posX, y: ps.posY, z: playerShip.getZ() });
      enemyAttackTimer = randomBetween(2.8, 5.5);
    }

    playerShip.updatePowerUps(delta);

    // Power-up collection
    const collected = playerShip.checkPowerUpCollect();
    if (collected.length) {
      for (const t of collected) {
        explosions.spawn(ps.posX, ps.posY, playerShip.getZ(), "powerup");
        hud?.flashPowerUp(t);
      }
      hud?.update({ score, combo, ...playerShip.getState() });
    }

    // Shots vs enemies + meteors
    const shots = playerShip.getShots();
    if (ships.getActivePositions) checkShotsVsShips(shots, ships.getActivePositions());
    checkShotsVsMeteors(shots);

    // Collision vs environment — ship never dies (takeDamage always returns false)
    checkAsteroidsVsPlayer(ps.posX, ps.posY);
    checkMeteorsVsPlayer(ps.posX, ps.posY);
    checkStreaksVsPlayer(ps.posX, ps.posY);
  }

  return { getState, start, end, restart, update };
}
