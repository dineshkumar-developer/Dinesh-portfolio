import { createDisposer } from "./lifecycle.js";
import { clamp, prefersReducedMotion, rafThrottle, toArray } from "./utils.js";

const HERO_PHRASES = [
  "pixijs, gsap, and spine animation pipelines",
  "slots, table games, and crash game mechanics",
  "responsive ui for mobile, tablet, and desktop",
  "ai-assisted development with clean code quality"
];

export function createAmbientController() {
  const cleanup = createDisposer();
  const reducedMotion = prefersReducedMotion();
  const finePointerQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(hover: hover) and (pointer: fine)")
      : { matches: false };
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.getElementById("site-nav");
  const navLinks = toArray(document.querySelectorAll(".site-nav a"));
  const sections = toArray(document.querySelectorAll("main section[id]"));
  const revealItems = toArray(document.querySelectorAll(".reveal"));
  const heroTypedText = document.getElementById("heroTypedText");
  const interactiveCards = toArray(document.querySelectorAll(".panel"));

  initNavigation();
  initReveals();
  initHeroSignal();
  initInteractiveCards();
  initScrollAccent();
  initContactCopy(cleanup);
  initMagneticButtons(cleanup, reducedMotion, finePointerQuery);
  if (!reducedMotion) initHeroParallax(cleanup);

  return {
    destroy: () => cleanup.destroy(),
    reducedMotion
  };

  function closeNav() {
    siteNav?.classList.remove("is-open");
    navToggle?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  }

  function initNavigation() {
    cleanup.listen(navToggle, "click", (event) => {
      event.stopPropagation();
      const isOpen = siteNav?.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", Boolean(isOpen));
      navToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
    });

    navLinks.forEach((link) => {
      cleanup.listen(link, "click", closeNav);
    });

    cleanup.listen(document, "click", (event) => {
      if (!siteNav?.classList.contains("is-open")) return;
      if (siteNav.contains(event.target)) return;
      if (navToggle?.contains(event.target)) return;
      closeNav();
    });

    cleanup.listen(document, "keydown", (event) => {
      if (event.key === "Escape" && siteNav?.classList.contains("is-open")) {
        closeNav();
      }
    });

    if ("IntersectionObserver" in window && sections.length) {
      const sectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            const activeId = `#${entry.target.id}`;
            navLinks.forEach((link) => {
              const isActive = link.getAttribute("href") === activeId;
              link.classList.toggle("is-active", isActive);

              if (isActive) {
                link.setAttribute("aria-current", "page");
              } else {
                link.removeAttribute("aria-current");
              }
            });
          });
        },
        {
          rootMargin: "-45% 0px -45% 0px",
          threshold: 0
        }
      );

      sections.forEach((section) => sectionObserver.observe(section));
      cleanup.add(() => sectionObserver.disconnect());
    }

    cleanup.listen(window, "popstate", closeNav);
  }

  function initReveals() {
    // Assign alternating slide-in directions to direct grid children
    const gridSelectors = [
      ".capability-grid > .reveal",
      ".scope-grid > .reveal",
      ".experience-grid > .reveal",
      ".skills-grid > .reveal",
      ".education-grid > .reveal",
      ".contact-grid > .reveal",
      ".metric-grid > .reveal"
    ].join(", ");
    const gridItems = toArray(document.querySelectorAll(gridSelectors));
    const gridCounters = new Map();
    gridItems.forEach((item) => {
      const grid = item.parentElement;
      const idx = gridCounters.get(grid) ?? 0;
      item.classList.add(idx % 2 === 0 ? "reveal--from-left" : "reveal--from-right");
      gridCounters.set(grid, idx + 1);
    });

    const sectionSequence = new Map();
    revealItems.forEach((item) => {
      const scope =
        item.closest(".hero") ||
        item.closest(".section") ||
        item.parentElement ||
        document.body;
      const currentIndex = sectionSequence.get(scope) || 0;
      const delay = Math.min(currentIndex * 0.038, 0.18);
      const distance = Math.min(16 + currentIndex * 2, 26);

      item.style.setProperty("--reveal-delay", `${delay.toFixed(2)}s`);
      item.style.setProperty("--reveal-distance", `${distance}px`);
      sectionSequence.set(scope, currentIndex + 1);
    });

    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
    cleanup.add(() => revealObserver.disconnect());
  }

  function initHeroSignal() {
    if (!heroTypedText) {
      return;
    }

    if (reducedMotion) {
      heroTypedText.textContent = HERO_PHRASES[0];
      return;
    }

    let phraseIndex = 0;
    let heroIntervalId = 0;

    const swapPhrase = () => {
      phraseIndex = (phraseIndex + 1) % HERO_PHRASES.length;
      heroTypedText.classList.remove("is-swapping");

      cleanup.raf(() => {
        heroTypedText.classList.add("is-swapping");
        heroTypedText.textContent = HERO_PHRASES[phraseIndex];
      });
    };

    const stop = () => {
      if (heroIntervalId) {
        cleanup.clearInterval(heroIntervalId);
        heroIntervalId = 0;
      }
    };

    const start = () => {
      if (heroIntervalId || document.hidden) {
        return;
      }

      heroIntervalId = cleanup.interval(swapPhrase, 2600);
    };

    cleanup.listen(document, "visibilitychange", () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });
    cleanup.add(stop);
    start();
  }

  function initInteractiveCards() {
    if (reducedMotion || !finePointerQuery.matches) {
      return;
    }

    const clearPressedState = () => {
      interactiveCards.forEach((card) => {
        card.classList.remove("is-pressed");
        card.style.removeProperty("--tilt-x");
        card.style.removeProperty("--tilt-y");
      });
    };

    cleanup.listen(window, "blur", clearPressedState);
    cleanup.listen(document, "visibilitychange", () => {
      if (document.hidden) {
        clearPressedState();
      }
    });

    interactiveCards.forEach((card) => {
      const updateCardTilt = rafThrottle((clientX, clientY) => {
        const rect = card.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const rotateY = clamp(((x / rect.width) - 0.5) * 10, -5, 5);
        const rotateX = clamp((0.5 - y / rect.height) * 8, -4, 4);

        card.style.setProperty("--pointer-x", `${x}px`);
        card.style.setProperty("--pointer-y", `${y}px`);
        card.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
      });
      cleanup.add(() => updateCardTilt.cancel?.());

      cleanup.listen(card, "pointermove", (event) => {
        updateCardTilt(event.clientX, event.clientY);
      });

      cleanup.listen(card, "pointerleave", () => {
        updateCardTilt.cancel?.();
        card.style.removeProperty("--tilt-x");
        card.style.removeProperty("--tilt-y");
        card.classList.remove("is-pressed");
      });

      cleanup.listen(card, "pointerdown", () => {
        card.classList.add("is-pressed");
      });

      cleanup.listen(card, "pointerup", () => {
        card.classList.remove("is-pressed");
      });

      cleanup.listen(card, "pointercancel", () => {
        card.classList.remove("is-pressed");
      });
    });
  }

  function initScrollAccent() {
    let scrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const recomputeScrollable = () => {
      scrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    };

    const update = rafThrottle(() => {
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      document.documentElement.style.setProperty("--scroll-progress", progress.toFixed(3));
    });

    update();
    cleanup.listen(window, "scroll", update, { passive: true });
    cleanup.listen(window, "resize", recomputeScrollable, { passive: true });
    cleanup.add(() => update.cancel?.());
  }
}

// ─── Contact Copy ─────────────────────────────────────────────────────────────

function initContactCopy(cleanup) {
  if (!navigator.clipboard) return;

  const contactLinks = document.querySelectorAll(".contact-card a[href^='tel:'], .contact-card a[href^='mailto:']");
  if (!contactLinks.length) return;

  contactLinks.forEach((link) => {
    link.setAttribute("title", "Click to copy");

    cleanup.listen(link, "click", (e) => {
      e.preventDefault();
      const href = link.getAttribute("href") || "";
      const text = href.replace(/^(tel:|mailto:)/, "");

      navigator.clipboard.writeText(text).then(() => {
        showToast("Copied!");
      }).catch(() => {
        window.location.href = href;
      });
    });
  });
}

function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("is-leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, 1800);
}

// ─── Magnetic Buttons ─────────────────────────────────────────────────────────

function initMagneticButtons(cleanup, reducedMotion, finePointerQuery) {
  if (reducedMotion || !finePointerQuery.matches) return;

  const btns = document.querySelectorAll(".btn--primary, .btn--secondary");
  if (!btns.length) return;

  btns.forEach((btn) => {
    let animId = 0;
    let ox = 0;
    let oy = 0;

    const onMove = (e) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const tx = dx * 7;
      const ty = dy * 4;

      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        ox = tx;
        oy = ty;
        btn.style.transform = `translateY(var(--interactive-lift)) translate(${tx}px, ${ty}px)`;
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(animId);
      const ease = () => {
        ox *= 0.72;
        oy *= 0.72;
        if (Math.abs(ox) < 0.1 && Math.abs(oy) < 0.1) {
          btn.style.transform = "";
          return;
        }
        btn.style.transform = `translate(${ox}px, ${oy}px)`;
        animId = requestAnimationFrame(ease);
      };
      ease();
    };

    cleanup.listen(btn, "mousemove", onMove, { passive: true });
    cleanup.listen(btn, "mouseleave", onLeave, { passive: true });
    cleanup.add(() => cancelAnimationFrame(animId));
  });
}

// ─── Hero Parallax ────────────────────────────────────────────────────────────

function initHeroParallax(cleanup) {
  const heroContent = document.querySelector(".hero__content");
  const heroPanel = document.querySelector(".hero__panel");
  if (!heroContent && !heroPanel) return;

  const heroEl = document.querySelector(".hero");
  let heroHeight = heroEl?.offsetHeight || window.innerHeight;
  const recomputeHeight = () => {
    heroHeight = heroEl?.offsetHeight || window.innerHeight;
  };

  // Remove transform transition so scroll-driven parallax is instant, keep opacity fade
  const noTransition = (el) => {
    if (el) el.style.transition = "opacity 340ms ease";
  };
  cleanup.timeout(() => {
    noTransition(heroContent);
    noTransition(heroPanel);
  }, 800);

  const update = rafThrottle(() => {
    const scrollY = window.scrollY;
    if (scrollY > heroHeight) return;

    const progress = scrollY / heroHeight;
    if (heroContent) heroContent.style.transform = `translate3d(0, ${progress * 28}px, 0)`;
    if (heroPanel) heroPanel.style.transform = `translate3d(0, ${progress * 14}px, 0)`;
  });

  update();
  cleanup.listen(window, "scroll", update, { passive: true });
  cleanup.listen(window, "resize", recomputeHeight, { passive: true });
  cleanup.add(() => {
    update.cancel?.();
    if (heroContent) { heroContent.style.transform = ""; heroContent.style.transition = ""; }
    if (heroPanel) { heroPanel.style.transform = ""; heroPanel.style.transition = ""; }
  });
}
