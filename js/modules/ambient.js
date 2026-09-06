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
  const gsap = window.gsap;

  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.getElementById("site-nav");
  const navLinks = toArray(document.querySelectorAll(".site-nav a"));
  const sections = toArray(document.querySelectorAll("main section[id]"));
  const heroGrid = document.querySelector(".hero__grid");
  const heroTypedText = document.getElementById("heroTypedText");
  const interactiveCards = toArray(document.querySelectorAll(".panel"));

  initNavigation();
  initHeroSignal();
  initHeroMouseGlow();
  initInteractiveCards();
  initScrollProgress();
  initContactCopy();
  initMagneticButtons();

  return { destroy: () => cleanup.destroy() };

  // ─── Navigation ─────────────────────────────────────────────
  function initNavigation() {
    const closeNav = () => {
      if (!siteNav) return;
      siteNav.classList.remove("is-open");
      navToggle?.classList.remove("is-open");
      navToggle?.setAttribute("aria-expanded", "false");
    };

    if (navToggle && siteNav) {
      cleanup.listen(navToggle, "click", () => {
        const open = siteNav.classList.toggle("is-open");
        navToggle.classList.toggle("is-open", open);
        navToggle.setAttribute("aria-expanded", String(open));
      });
    }

    navLinks.forEach((link) => {
      cleanup.listen(link, "click", closeNav);
    });

    // Close on outside pointer — only active while the menu is open
    cleanup.listen(document, "pointerdown", (event) => {
      if (!siteNav?.classList.contains("is-open")) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (siteNav.contains(target)) return;
      if (navToggle && navToggle.contains(target)) return;
      closeNav();
    });

    // Close on Escape for keyboard users
    cleanup.listen(document, "keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!siteNav?.classList.contains("is-open")) return;
      closeNav();
      navToggle?.focus();
    });

    if ("IntersectionObserver" in window && sections.length) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const activeId = `#${entry.target.id}`;
            navLinks.forEach((link) => {
              const isActive = link.getAttribute("href") === activeId;
              link.classList.toggle("is-active", isActive);
              if (isActive) link.setAttribute("aria-current", "page");
              else link.removeAttribute("aria-current");
            });
          });
        },
        { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
      );
      sections.forEach((section) => observer.observe(section));
      cleanup.add(() => observer.disconnect());
    }

    cleanup.listen(window, "popstate", closeNav);
  }

  // ─── Hero signal cycling ───────────────────────────────────
  function initHeroSignal() {
    if (!heroTypedText) return;

    if (reducedMotion) {
      heroTypedText.textContent = HERO_PHRASES[0];
      return;
    }

    let phraseIndex = 0;
    let intervalId = 0;

    const swap = () => {
      phraseIndex = (phraseIndex + 1) % HERO_PHRASES.length;
      if (gsap) {
        gsap.to(heroTypedText, {
          opacity: 0,
          y: -6,
          duration: 0.22,
          ease: "power2.in",
          onComplete: () => {
            heroTypedText.textContent = HERO_PHRASES[phraseIndex];
            gsap.fromTo(heroTypedText,
              { opacity: 0, y: 8 },
              { opacity: 1, y: 0, duration: 0.42, ease: "power3.out" }
            );
          }
        });
      } else {
        heroTypedText.textContent = HERO_PHRASES[phraseIndex];
      }
    };

    const stop = () => {
      if (intervalId) {
        cleanup.clearInterval(intervalId);
        intervalId = 0;
      }
    };
    const start = () => {
      if (intervalId || document.hidden) return;
      intervalId = cleanup.interval(swap, 3000);
    };

    cleanup.listen(document, "visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });
    cleanup.add(stop);
    start();
  }

  // ─── Hero mouse-follow light ───────────────────────────────
  function initHeroMouseGlow() {
    if (!heroGrid || reducedMotion || !finePointerQuery.matches) return;

    let glow = heroGrid.querySelector(".hero__glow");
    if (!glow) {
      glow = document.createElement("div");
      glow.className = "hero__glow";
      glow.setAttribute("aria-hidden", "true");
      heroGrid.prepend(glow);
    }

    if (gsap) {
      const setHx = gsap.quickTo(glow, "--hx", { duration: 0.6, ease: "power3.out" });
      const setHy = gsap.quickTo(glow, "--hy", { duration: 0.6, ease: "power3.out" });

      cleanup.listen(heroGrid, "pointermove", (event) => {
        const rect = heroGrid.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width * 0.5;
        const y = event.clientY - rect.top - rect.height * 0.5;
        setHx(x * 0.26);
        setHy(y * 0.26);
      }, { passive: true });

      cleanup.listen(heroGrid, "pointerleave", () => {
        setHx(0);
        setHy(0);
      });
    } else {
      const update = rafThrottle((clientX, clientY) => {
        const rect = heroGrid.getBoundingClientRect();
        const x = clientX - rect.left - rect.width * 0.5;
        const y = clientY - rect.top - rect.height * 0.5;
        glow.style.setProperty("--hx", `${(x * 0.25).toFixed(2)}px`);
        glow.style.setProperty("--hy", `${(y * 0.25).toFixed(2)}px`);
      });
      cleanup.listen(heroGrid, "pointermove", (event) => update(event.clientX, event.clientY), { passive: true });
      cleanup.listen(heroGrid, "pointerleave", () => {
        glow.style.setProperty("--hx", "0px");
        glow.style.setProperty("--hy", "0px");
      });
      cleanup.add(() => update.cancel?.());
    }
  }

  // ─── Panel tilt + pointer light (GSAP quickTo when available)
  function initInteractiveCards() {
    if (reducedMotion || !finePointerQuery.matches) return;

    const clearAll = () => {
      interactiveCards.forEach((card) => {
        card.classList.remove("is-pressed");
        card.style.removeProperty("--tilt-x");
        card.style.removeProperty("--tilt-y");
        card.style.removeProperty("--pointer-x");
        card.style.removeProperty("--pointer-y");
      });
    };
    cleanup.listen(window, "blur", clearAll);
    cleanup.listen(document, "visibilitychange", () => {
      if (document.hidden) clearAll();
    });

    interactiveCards.forEach((card) => {
      if (gsap) {
        const setTiltX = gsap.quickTo(card, "--tilt-x", { duration: 0.35, ease: "power3.out" });
        const setTiltY = gsap.quickTo(card, "--tilt-y", { duration: 0.35, ease: "power3.out" });

        cleanup.listen(card, "pointermove", (event) => {
          const rect = card.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          const ry = clamp(((x / rect.width) - 0.5) * 8, -4, 4);
          const rx = clamp((0.5 - y / rect.height) * 6, -3, 3);
          card.style.setProperty("--pointer-x", `${(x / rect.width) * 100}%`);
          card.style.setProperty("--pointer-y", `${(y / rect.height) * 100}%`);
          setTiltX(rx);
          setTiltY(ry);
        }, { passive: true });

        cleanup.listen(card, "pointerleave", () => {
          setTiltX(0);
          setTiltY(0);
          card.classList.remove("is-pressed");
        });
      } else {
        const update = rafThrottle((clientX, clientY) => {
          const rect = card.getBoundingClientRect();
          const x = clientX - rect.left;
          const y = clientY - rect.top;
          const ry = clamp(((x / rect.width) - 0.5) * 8, -4, 4);
          const rx = clamp((0.5 - y / rect.height) * 6, -3, 3);
          card.style.setProperty("--pointer-x", `${(x / rect.width) * 100}%`);
          card.style.setProperty("--pointer-y", `${(y / rect.height) * 100}%`);
          card.style.setProperty("--tilt-x", `${rx.toFixed(2)}deg`);
          card.style.setProperty("--tilt-y", `${ry.toFixed(2)}deg`);
        });
        cleanup.add(() => update.cancel?.());
        cleanup.listen(card, "pointermove", (event) => update(event.clientX, event.clientY), { passive: true });
        cleanup.listen(card, "pointerleave", () => {
          update.cancel?.();
          card.style.removeProperty("--tilt-x");
          card.style.removeProperty("--tilt-y");
          card.classList.remove("is-pressed");
        });
      }

      cleanup.listen(card, "pointerdown", () => card.classList.add("is-pressed"));
      cleanup.listen(card, "pointerup", () => card.classList.remove("is-pressed"));
      cleanup.listen(card, "pointercancel", () => card.classList.remove("is-pressed"));
    });
  }

  // ─── Scroll progress bar ───────────────────────────────────
  function initScrollProgress() {
    const update = rafThrottle(() => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      document.documentElement.style.setProperty("--scroll-progress", progress.toFixed(3));
    });
    update();
    cleanup.listen(window, "scroll", update, { passive: true });
    cleanup.add(() => update.cancel?.());
  }

  // ─── Contact copy ───────────────────────────────────────────
  function initContactCopy() {
    if (!navigator.clipboard) return;
    const links = document.querySelectorAll(".contact-card a[href^='tel:'], .contact-card a[href^='mailto:']");
    if (!links.length) return;

    links.forEach((link) => {
      link.setAttribute("title", "Click to copy");
      cleanup.listen(link, "click", (event) => {
        event.preventDefault();
        const href = link.getAttribute("href") || "";
        const text = href.replace(/^(tel:|mailto:)/, "");
        navigator.clipboard.writeText(text).then(
          () => showToast("Copied to clipboard", cleanup),
          () => { window.location.href = href; }
        );
      });
    });
  }

  // ─── Magnetic buttons (GSAP quickTo) ───────────────────────
  function initMagneticButtons() {
    if (reducedMotion || !finePointerQuery.matches) return;

    const buttons = document.querySelectorAll(".btn--primary, .btn--secondary");
    if (!buttons.length) return;

    buttons.forEach((btn) => {
      if (gsap) {
        const setX = gsap.quickTo(btn, "x", { duration: 0.35, ease: "power3.out" });
        const setY = gsap.quickTo(btn, "y", { duration: 0.35, ease: "power3.out" });

        cleanup.listen(btn, "mousemove", (event) => {
          const rect = btn.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = (event.clientX - cx) / (rect.width / 2);
          const dy = (event.clientY - cy) / (rect.height / 2);
          setX(dx * 9);
          setY(dy * 5);
        }, { passive: true });

        cleanup.listen(btn, "mouseleave", () => {
          setX(0);
          setY(0);
        }, { passive: true });
      } else {
        let animId = 0;
        let offsetX = 0;
        let offsetY = 0;
        const onMove = (event) => {
          const rect = btn.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = (event.clientX - cx) / (rect.width / 2);
          const dy = (event.clientY - cy) / (rect.height / 2);
          const tx = dx * 8;
          const ty = dy * 5;
          cancelAnimationFrame(animId);
          animId = requestAnimationFrame(() => {
            offsetX = tx; offsetY = ty;
            btn.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`;
          });
        };
        const onLeave = () => {
          cancelAnimationFrame(animId);
          const ease = () => {
            offsetX *= 0.78; offsetY *= 0.78;
            if (Math.abs(offsetX) < 0.2 && Math.abs(offsetY) < 0.2) {
              btn.style.transform = "";
              return;
            }
            btn.style.transform = `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px)`;
            animId = requestAnimationFrame(ease);
          };
          ease();
        };
        cleanup.listen(btn, "mousemove", onMove, { passive: true });
        cleanup.listen(btn, "mouseleave", onLeave, { passive: true });
        cleanup.add(() => cancelAnimationFrame(animId));
      }
    });
  }
}

function showToast(message, cleanup) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  const scheduleLeave = cleanup
    ? (fn, delay) => cleanup.timeout(fn, delay)
    : (fn, delay) => window.setTimeout(fn, delay);
  scheduleLeave(() => {
    toast.classList.add("is-leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, 1800);
}
