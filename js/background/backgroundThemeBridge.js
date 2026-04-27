export function createBackgroundThemeBridge() {
  const root = document.documentElement;
  const previousValues = new Map();
  let applied = false;
  let previousBodyQuality = "";
  let previousRootQuality = "";
  let bodyHadThemeClass = false;

  function setProperty(name, value) {
    if (!previousValues.has(name)) {
      previousValues.set(name, root.style.getPropertyValue(name));
    }

    root.style.setProperty(name, value);
  }

  function apply(profile = {}) {
    const qualityName = profile.name || "high";
    const glowStrength = profile.glowStrength ?? 1;

    if (!applied) {
      bodyHadThemeClass = document.body.classList.contains("theme-space");
      previousBodyQuality = document.body.dataset.spaceQuality || "";
      previousRootQuality = root.dataset.spaceQuality || "";
    }

    document.body.classList.add("theme-space");
    document.body.dataset.spaceQuality = qualityName;
    root.dataset.spaceQuality = qualityName;

    setProperty("--space-glow-strength", glowStrength.toFixed(2));
    setProperty("--space-panel-blur", qualityName === "low" ? "12px" : "18px");
    setProperty("--space-surface", qualityName === "low" ? "rgba(8, 15, 29, 0.8)" : "rgba(8, 15, 29, 0.76)");
    setProperty("--space-surface-strong", qualityName === "low" ? "rgba(10, 18, 34, 0.9)" : "rgba(10, 18, 34, 0.88)");
    setProperty("--space-border", "rgba(145, 181, 218, 0.18)");
    setProperty("--space-border-strong", "rgba(150, 203, 234, 0.3)");
    setProperty("--space-text", "#dde8f8");
    setProperty("--space-text-strong", "#f3f8ff");
    setProperty("--space-muted", "#a4b4cc");
    setProperty("--space-accent", "#9dcbe7");
    setProperty("--space-accent-alt", "#cba47e");
    setProperty("--space-gold", "#d8c08c");

    applied = true;
  }

  function destroy() {
    if (!applied) {
      return;
    }

    if (!bodyHadThemeClass) {
      document.body.classList.remove("theme-space");
    }

    if (previousBodyQuality) {
      document.body.dataset.spaceQuality = previousBodyQuality;
    } else {
      delete document.body.dataset.spaceQuality;
    }

    if (previousRootQuality) {
      root.dataset.spaceQuality = previousRootQuality;
    } else {
      delete root.dataset.spaceQuality;
    }

    previousValues.forEach((value, key) => {
      if (value) {
        root.style.setProperty(key, value);
      } else {
        root.style.removeProperty(key);
      }
    });

    previousValues.clear();
    applied = false;
    previousBodyQuality = "";
    previousRootQuality = "";
    bodyHadThemeClass = false;
  }

  return {
    apply,
    destroy
  };
}
