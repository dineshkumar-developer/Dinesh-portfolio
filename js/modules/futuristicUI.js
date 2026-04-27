import { createDisposer } from "./lifecycle.js";

export function createFuturisticUIController() {
  const cleanup = createDisposer();

  initHUDOverlay();

  return { destroy: () => cleanup.destroy() };

  function initHUDOverlay() {
    const hud = document.querySelector(".hud-overlay");
    if (!hud) return;

    hud.removeAttribute("hidden");
    const timeEl = hud.querySelector(".hud-time");
    if (!timeEl) return;

    const tick = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      const s = String(d.getSeconds()).padStart(2, "0");
      timeEl.textContent = `${h}:${m}:${s}`;
    };
    tick();
    cleanup.interval(tick, 1000);
  }
}
