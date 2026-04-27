import { createDisposer } from "./lifecycle.js";
import { prefersReducedMotion } from "./utils.js";

export function createParticlesController() {
  const canvas = document.getElementById("particlesCanvas");
  if (!canvas) return { destroy: () => {} };

  // Touch devices pay heavy compositing cost for a fullscreen
  // canvas + backdrop-filtered layers above it. Skip the particle
  // field on coarse pointers entirely.
  const coarsePointer = typeof window.matchMedia === "function"
    && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  if (coarsePointer) {
    canvas.style.display = "none";
    return { destroy: () => {} };
  }

  const reducedMotion = prefersReducedMotion();
  const cleanup = createDisposer();
  const ctx = canvas.getContext("2d");
  if (!ctx) return { destroy: () => {} };

  const PALETTE = [
    "rgba(37, 99, 235, 0.55)",   // blue
    "rgba(6, 182, 212, 0.50)",   // cyan
    "rgba(124, 58, 237, 0.50)",  // tech violet
    "rgba(132, 204, 22, 0.50)",  // lime
    "rgba(245, 158, 11, 0.45)"   // amber
  ];

  let width = 0;
  let height = 0;
  let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let particles = [];
  let rafId = 0;
  let running = false;

  function countForViewport() {
    const area = width * height;
    const compact = width < 900;
    const base = compact ? 24 : 48;
    return Math.min(72, Math.round(base + area / 60000));
  }

  function seedParticle(p, reseedFromTop = false) {
    p.x = Math.random() * width;
    p.y = reseedFromTop ? height + Math.random() * 40 : Math.random() * height;
    p.r = 0.6 + Math.random() * 1.4;
    p.vx = (Math.random() - 0.5) * 0.08;
    p.vy = -(0.08 + Math.random() * 0.22);
    p.life = Math.random();
    p.lifeSpeed = 0.0012 + Math.random() * 0.0022;
    p.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    p.shape = Math.random() < 0.75 ? "dot" : Math.random() < 0.5 ? "dash" : "square";
    p.rotation = Math.random() * Math.PI * 2;
    p.rotationSpeed = (Math.random() - 0.5) * 0.006;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width || window.innerWidth);
    height = Math.max(1, rect.height || window.innerHeight);
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = countForViewport();
    if (particles.length < target) {
      for (let i = particles.length; i < target; i += 1) {
        const p = {};
        seedParticle(p);
        particles.push(p);
      }
    } else if (particles.length > target) {
      particles.length = target;
    }
  }

  function step() {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life += p.lifeSpeed;
      p.rotation += p.rotationSpeed;

      const lifeFactor = Math.sin(p.life * Math.PI);
      const alphaMul = Math.max(0.1, lifeFactor);

      if (p.y < -20 || p.x < -20 || p.x > width + 20) {
        seedParticle(p, true);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = alphaMul;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.shape === "dash") {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-p.r * 3, 0);
        ctx.lineTo(p.r * 3, 0);
        ctx.stroke();
      } else if (p.shape === "square") {
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    rafId = window.requestAnimationFrame(step);
  }

  function start() {
    if (running || reducedMotion) return;
    running = true;
    rafId = window.requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  const onResize = () => resize();
  cleanup.listen(window, "resize", onResize, { passive: true });
  cleanup.listen(window, "orientationchange", onResize, { passive: true });
  cleanup.listen(document, "visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  resize();
  if (reducedMotion) {
    ctx.clearRect(0, 0, width, height);
  } else {
    start();
  }

  function destroy() {
    stop();
    particles.length = 0;
    cleanup.destroy();
  }

  return { destroy };
}
