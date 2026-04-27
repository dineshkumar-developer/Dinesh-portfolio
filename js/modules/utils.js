export function toArray(value) {
  return Array.from(value || []);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function prefersReducedMotion() {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

export function rafThrottle(callback) {
  let frameId = 0;
  let lastArgs = [];

  const throttled = (...args) => {
    lastArgs = args;

    if (frameId) {
      return;
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = 0;
      callback(...lastArgs);
    });
  };

  throttled.cancel = () => {
    if (!frameId) {
      return;
    }

    window.cancelAnimationFrame(frameId);
    frameId = 0;
  };

  return throttled;
}
