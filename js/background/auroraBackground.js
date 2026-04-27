import { createDisposer } from "../modules/lifecycle.js";
import { prefersReducedMotion, rafThrottle } from "../modules/utils.js";

const BLOBS = [
  { selector: ".aurora-blob--a", rangeX: 36, rangeY: 26, speed: 0.00018, phaseOffset: 0.0,  mouseWeight: 0.35 },
  { selector: ".aurora-blob--b", rangeX: 42, rangeY: 28, speed: 0.00022, phaseOffset: 1.9,  mouseWeight: 0.20 },
  { selector: ".aurora-blob--c", rangeX: 48, rangeY: 30, speed: 0.00015, phaseOffset: 3.4,  mouseWeight: 0.15 },
  { selector: ".aurora-blob--d", rangeX: 40, rangeY: 28, speed: 0.00020, phaseOffset: 5.1,  mouseWeight: 0.22 },
  { selector: ".aurora-blob--e", rangeX: 22, rangeY: 18, speed: 0.00028, phaseOffset: 2.2,  mouseWeight: 0.45 }
];

export function createAuroraBackgroundController() {
  const cleanup = createDisposer();
  const shell = document.querySelector(".scene-shell");

  if (!shell) {
    return { destroy: () => {} };
  }

  const reduced = prefersReducedMotion();
  const reducedMotionQuery = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const coarsePointer = typeof window.matchMedia === "function"
    && window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  const blobs = BLOBS
    .map((cfg) => {
      const el = shell.querySelector(cfg.selector);
      return el ? { ...cfg, el } : null;
    })
    .filter(Boolean);

  if (!blobs.length) {
    return { destroy: () => {} };
  }

  // On touch devices the drifting blobs cost far more (huge blurred
  // layers + constant transform updates) than they're worth. Paint
  // them once at rest and skip the rAF loop + pointer tracking.
  if (coarsePointer) {
    for (let i = 0; i < blobs.length; i += 1) {
      blobs[i].el.style.setProperty("--tx", "0px");
      blobs[i].el.style.setProperty("--ty", "0px");
    }
    return { destroy: () => {} };
  }

  let mouseX = 0;
  let mouseY = 0;
  let running = false;
  let rafId = 0;
  let isReduced = reduced;
  let hidden = document.hidden;

  const onPointer = rafThrottle((event) => {
    const viewportW = window.innerWidth || 1;
    const viewportH = window.innerHeight || 1;
    mouseX = (event.clientX / viewportW) * 2 - 1;
    mouseY = (event.clientY / viewportH) * 2 - 1;
  });

  function tick(timestamp) {
    if (!running) return;

    for (let i = 0; i < blobs.length; i += 1) {
      const blob = blobs[i];
      const t = timestamp * blob.speed + blob.phaseOffset;
      const driftX = Math.sin(t) * blob.rangeX + Math.cos(t * 0.37) * blob.rangeX * 0.3;
      const driftY = Math.cos(t * 0.83) * blob.rangeY + Math.sin(t * 0.41) * blob.rangeY * 0.25;
      const mx = mouseX * blob.mouseWeight * blob.rangeX * 1.2;
      const my = mouseY * blob.mouseWeight * blob.rangeY * 1.2;
      blob.el.style.setProperty("--tx", `${(driftX + mx).toFixed(2)}px`);
      blob.el.style.setProperty("--ty", `${(driftY + my).toFixed(2)}px`);
    }

    rafId = window.requestAnimationFrame(tick);
  }

  function start() {
    if (running || isReduced || hidden) return;
    running = true;
    rafId = window.requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function applyStatic() {
    for (let i = 0; i < blobs.length; i += 1) {
      blobs[i].el.style.setProperty("--tx", "0px");
      blobs[i].el.style.setProperty("--ty", "0px");
    }
  }

  cleanup.listen(document, "pointermove", onPointer, { passive: true });
  cleanup.listen(document, "visibilitychange", () => {
    hidden = document.hidden;
    if (hidden) {
      stop();
    } else if (!isReduced) {
      start();
    }
  });

  if (reducedMotionQuery) {
    const onReducedChange = (event) => {
      isReduced = event.matches;
      if (isReduced) {
        stop();
        applyStatic();
      } else {
        start();
      }
    };
    cleanup.listen(reducedMotionQuery, "change", onReducedChange);
  }

  if (isReduced) {
    applyStatic();
  } else {
    start();
  }

  function destroy() {
    stop();
    cleanup.destroy();
    applyStatic();
  }

  return { destroy };
}
