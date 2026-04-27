export function createGameHUD() {
  const el = document.getElementById("game-hud");
  if (!el) return null;

  const scoreEl   = el.querySelector(".ghud-score-val");
  const comboEl   = el.querySelector(".ghud-combo");
  const hpBarEl   = el.querySelector(".ghud-hp-bar");
  const shBarEl   = el.querySelector(".ghud-sh-bar");
  const hpNumEl   = el.querySelector(".ghud-hp-num");
  const overlayEl = document.getElementById("game-overlay");
  const ovTitleEl = overlayEl?.querySelector(".gov-title");
  const ovSubEl   = overlayEl?.querySelector(".gov-sub");
  const ovScoreEl = overlayEl?.querySelector(".gov-score");
  const ovHintEl  = overlayEl?.querySelector(".gov-tap-hint");
  const puIndicEl = el.querySelector(".ghud-powerups");

  const puLabels  = { shield: "SHIELD", rapidfire: "RAPID FIRE", speed: "SPEED BOOST", health: "MEDKIT" };
  const puColors  = { shield: "#00ffaa", rapidfire: "#ff4400", speed: "#ffdd00", health: "#ff44aa" };

  let visible = false;
  let overlayClickHandler = null;

  function clearOverlayClick() {
    if (overlayClickHandler && overlayEl) {
      overlayEl.removeEventListener("click",      overlayClickHandler);
      overlayEl.removeEventListener("touchstart", overlayClickHandler);
      overlayClickHandler = null;
    }
  }

  function show() {
    visible = true;
    el.removeAttribute("hidden");
    overlayEl?.setAttribute("hidden", "");
    clearOverlayClick();
  }

  function hide() {
    visible = false;
    el.setAttribute("hidden", "");
  }

  function showStart(onPlay) {
    clearOverlayClick();
    if (overlayEl) {
      overlayEl.removeAttribute("hidden");
      if (ovTitleEl) ovTitleEl.textContent = "SPACE DEFENDER";
      if (ovScoreEl) ovScoreEl.textContent = "";
      if (ovSubEl) {
        ovSubEl.innerHTML =
          "Pilot your ship. Destroy enemy fighters. Survive." +
          "<div class='gov-divider'></div>" +
          "<div class='gov-controls'>" +
          "<span><b>WASD</b> &nbsp;/&nbsp; joystick &mdash; Move</span>" +
          "<span><b>Click</b> &nbsp;/&nbsp; tap right &mdash; Fire</span>" +
          "<span><b>G</b> &mdash; Exit game</span>" +
          "</div>";
      }
      if (ovHintEl) {
        ovHintEl.textContent = "TAP ANYWHERE TO PLAY";
        ovHintEl.removeAttribute("hidden");
      }

      if (onPlay) {
        overlayClickHandler = (e) => {
          e.preventDefault();
          clearOverlayClick();
          onPlay();
        };
        overlayEl.addEventListener("click",      overlayClickHandler);
        overlayEl.addEventListener("touchstart", overlayClickHandler, { passive: false });
      }
    }
  }

  function showGameOver(score, onRestart) {
    clearOverlayClick();
    hide();
    if (overlayEl) {
      overlayEl.removeAttribute("hidden");
      if (ovTitleEl) ovTitleEl.textContent = "MISSION FAILED";
      if (ovScoreEl) ovScoreEl.textContent = `SCORE  ${score.toLocaleString()}`;
      if (ovSubEl) {
        ovSubEl.innerHTML =
          "<div class='gov-controls'>" +
          "<span>Tap anywhere &nbsp;/&nbsp; <b>R</b> &mdash; Respawn</span>" +
          "<span><b>G</b> &mdash; Return to portfolio</span>" +
          "</div>";
      }
      if (ovHintEl) {
        ovHintEl.textContent = "TAP TO RESPAWN";
        ovHintEl.removeAttribute("hidden");
      }

      if (onRestart) {
        overlayClickHandler = (e) => {
          e.preventDefault();
          clearOverlayClick();
          onRestart();
        };
        overlayEl.addEventListener("click",      overlayClickHandler);
        overlayEl.addEventListener("touchstart", overlayClickHandler, { passive: false });
      }
    }
  }

  function update({ score = 0, combo = 1, health = 100, shield = 0 } = {}) {
    if (!visible) return;
    if (scoreEl) scoreEl.textContent   = score.toLocaleString();
    if (comboEl) comboEl.textContent   = combo > 1 ? `×${combo} COMBO` : "";
    if (hpBarEl) hpBarEl.style.width   = Math.max(0, health) + "%";
    if (shBarEl) shBarEl.style.width   = Math.max(0, shield) + "%";
    if (hpNumEl) hpNumEl.textContent   = Math.ceil(Math.max(0, health));

    if (hpBarEl) {
      hpBarEl.style.background = health > 60 ? "var(--neon-cyan)"
                                : health > 30 ? "#ffcc00"
                                : "#ff3300";
    }
  }

  let puTimeout = null;
  function flashPowerUp(type) {
    if (!puIndicEl) return;
    clearTimeout(puTimeout);
    puIndicEl.textContent = puLabels[type] || type.toUpperCase();
    puIndicEl.style.color = puColors[type] || "#fff";
    puIndicEl.removeAttribute("hidden");
    puTimeout = setTimeout(() => puIndicEl.setAttribute("hidden", ""), 2200);
  }

  function flashDamage() {
    const el = document.getElementById("damage-flash");
    if (!el) return;
    el.classList.add("active");
    setTimeout(() => el.classList.remove("active"), 220);
  }

  function destroy() {
    hide();
    clearTimeout(puTimeout);
    clearOverlayClick();
    overlayEl?.setAttribute("hidden", "");
  }

  return { show, hide, showStart, showGameOver, update, flashPowerUp, flashDamage, destroy };
}
