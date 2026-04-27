export function createDisposer() {
  const disposers = new Set();
  const timeouts = new Set();
  const intervals = new Set();
  const frameIds = new Set();
  let destroyed = false;

  function add(dispose) {
    if (typeof dispose !== "function") {
      return () => {};
    }

    if (destroyed) {
      try {
        dispose();
      } catch (error) {
        // Cleanup should never throw into runtime code.
      }
      return () => {};
    }

    disposers.add(dispose);
    return () => {
      if (!disposers.delete(dispose)) {
        return;
      }

      try {
        dispose();
      } catch (error) {
        // Cleanup should never throw into runtime code.
      }
    };
  }

  function listen(target, type, handler, options) {
    if (!target || typeof handler !== "function") {
      return () => {};
    }

    if (typeof target.addEventListener === "function" && typeof target.removeEventListener === "function") {
      target.addEventListener(type, handler, options);
      return add(() => target.removeEventListener(type, handler, options));
    }

    // MediaQueryList in older Safari still exposes addListener/removeListener.
    if (typeof target.addListener === "function" && typeof target.removeListener === "function") {
      target.addListener(handler);
      return add(() => target.removeListener(handler));
    }

    return () => {};
  }

  function delegate(root, type, selector, handler, options) {
    if (!root?.addEventListener || typeof handler !== "function" || !selector) {
      return () => {};
    }

    return listen(
      root,
      type,
      (event) => {
        const eventTarget = event.target;
        const matched = eventTarget instanceof Element ? eventTarget.closest(selector) : null;

        if (!matched) {
          return;
        }

        if (root instanceof Element && !root.contains(matched)) {
          return;
        }

        handler(event, matched);
      },
      options
    );
  }

  function timeout(callback, delay = 0) {
    const timeoutId = window.setTimeout(() => {
      timeouts.delete(timeoutId);
      callback();
    }, delay);

    timeouts.add(timeoutId);
    return timeoutId;
  }

  function clearTimeoutId(timeoutId) {
    window.clearTimeout(timeoutId);
    timeouts.delete(timeoutId);
  }

  function interval(callback, delay = 0) {
    const intervalId = window.setInterval(callback, delay);
    intervals.add(intervalId);
    return intervalId;
  }

  function clearIntervalId(intervalId) {
    window.clearInterval(intervalId);
    intervals.delete(intervalId);
  }

  function raf(callback) {
    const frameId = window.requestAnimationFrame((time) => {
      frameIds.delete(frameId);
      callback(time);
    });

    frameIds.add(frameId);
    return frameId;
  }

  function cancelRaf(frameId) {
    window.cancelAnimationFrame(frameId);
    frameIds.delete(frameId);
  }

  function destroy() {
    if (destroyed) {
      return;
    }

    destroyed = true;

    timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeouts.clear();

    intervals.forEach((intervalId) => window.clearInterval(intervalId));
    intervals.clear();

    frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
    frameIds.clear();

    Array.from(disposers).reverse().forEach((dispose) => {
      try {
        dispose();
      } catch (error) {
        // Cleanup should never throw into runtime code.
      }
    });
    disposers.clear();
  }

  return {
    add,
    delegate,
    destroy,
    interval,
    isDestroyed: () => destroyed,
    listen,
    raf,
    timeout,
    clearInterval: clearIntervalId,
    clearTimeout: clearTimeoutId,
    cancelRaf
  };
}
