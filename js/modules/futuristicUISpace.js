import { createDisposer } from "./lifecycle.js";
import { prefersReducedMotion } from "./utils.js";

export function createFuturisticUIController() {
  const cleanup = createDisposer();
  const reducedMotion = prefersReducedMotion();

  initHUDOverlay(cleanup);
  initCountUpAnimations(cleanup, reducedMotion);
  initSkillBars(cleanup, reducedMotion);

  if (!reducedMotion) {
    initGlitchHeadings(cleanup);
    initScanlineCards(cleanup);
  }

  return { destroy: () => cleanup.destroy() };
}

// ─── HUD Overlay ─────────────────────────────────────────────────────────────

function initHUDOverlay(cleanup) {
  const hud = document.querySelector(".hud-overlay");
  if (!hud) return;

  hud.removeAttribute("hidden");

  const timeEl = hud.querySelector(".hud-time");

  if (timeEl) {
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

// ─── Count-up Animations ─────────────────────────────────────────────────────

function initCountUpAnimations(cleanup, reducedMotion) {
  if (reducedMotion) return;

  const metrics = document.querySelectorAll(".metric-card strong[data-count]");
  if (!metrics.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);

      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || "";
      const duration = 1600;
      const start = performance.now();

      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = target + suffix;
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });

  metrics.forEach((el) => observer.observe(el));
  cleanup.add(() => observer.disconnect());
}

// ─── Skill Bars ───────────────────────────────────────────────────────────────

function initSkillBars(cleanup, reducedMotion) {
  const bars = document.querySelectorAll(".skill-bar[data-level]");
  if (!bars.length) return;

  if (reducedMotion) {
    bars.forEach((bar) => {
      const fill = bar.querySelector(".skill-bar__fill");
      if (fill) fill.style.width = bar.dataset.level + "%";
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);

      const bar = entry.target;
      const level = parseInt(bar.dataset.level, 10);
      const fill = bar.querySelector(".skill-bar__fill");
      if (!fill) return;

      const start = performance.now();
      const duration = 1000 + level * 8;

      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        fill.style.width = (eased * level).toFixed(1) + "%";
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          fill.style.width = level + "%";
          fill.classList.add("is-filled");
        }
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.3 });

  bars.forEach((bar) => observer.observe(bar));
  cleanup.add(() => observer.disconnect());
}

// ─── Glitch Headings ─────────────────────────────────────────────────────────

function initGlitchHeadings(cleanup) {
  const headings = Array.from(document.querySelectorAll(".section-heading h2"));

  headings.forEach((el) => {
    el.classList.add("glitch-text");
    el.setAttribute("data-text", el.textContent);
  });

  let glitchActive = null;
  let ticks = 0;

  const id = cleanup.interval(() => {
    ticks++;
    if (ticks % (3 + Math.floor(Math.random() * 5)) !== 0) return;
    if (document.hidden || !headings.length) return;

    if (glitchActive) {
      glitchActive.classList.remove("is-glitching");
      glitchActive = null;
    }

    const visible = headings.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });

    if (!visible.length) return;

    glitchActive = visible[Math.floor(Math.random() * visible.length)];
    glitchActive.classList.add("is-glitching");
    cleanup.timeout(() => {
      glitchActive?.classList.remove("is-glitching");
      glitchActive = null;
    }, 320);
  }, 1400);
}

// ─── Scanline Cards ───────────────────────────────────────────────────────────

function initScanlineCards(cleanup) {
  const panels = document.querySelectorAll(".panel");

  panels.forEach((panel) => {
    const scanEl = document.createElement("span");
    scanEl.className = "panel-scan";
    scanEl.setAttribute("aria-hidden", "true");
    panel.appendChild(scanEl);
  });
}
