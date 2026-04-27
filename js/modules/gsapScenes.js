import { prefersReducedMotion } from "./utils.js";

export function createGsapScenes() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  // If GSAP didn't load, flip to fallback reveals via IntersectionObserver.
  if (!gsap) {
    document.documentElement.classList.add("no-gsap");
    initFallbackReveals();
    return { destroy: () => {} };
  }

  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const reducedMotion = prefersReducedMotion();
  const coarsePointer = typeof window.matchMedia === "function"
    && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const tweens = [];
  const triggers = [];

  gsap.defaults({ ease: "power3.out" });

  splitHeroHeadline();
  initHeroIntro();
  initScrollReveals();
  initSectionHeadings();
  initStaggerBullets();
  initStaggerChips();
  initStaggerKeyValues();
  initStaggerMetrics();
  initStaggerSkillBars();
  initTimelineScrub();
  initSkillBarScrub();
  initMetricCountUp();
  initHeroParallax();
  initHeaderScrollState();
  initIdleAnimations();
  initOrientationRefresh();

  if (ScrollTrigger) {
    // refresh after images/fonts settle
    const refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 400);
    triggers.push({ kill: () => window.clearTimeout(refreshTimer) });
  }

  return {
    destroy: () => {
      tweens.forEach((t) => t?.kill?.());
      if (ScrollTrigger) ScrollTrigger.getAll().forEach((st) => st.kill());
      triggers.forEach((t) => t?.kill?.());
    }
  };

  // ─── Hero headline split ──────────────────────────────────
  function splitHeroHeadline() {
    const h1 = document.querySelector(".hero h1");
    if (!h1 || h1.dataset.split === "1") return;
    const text = (h1.textContent || "").trim();
    if (!text) return;
    const words = text.split(/\s+/);
    const total = words.length;
    h1.innerHTML = words
      .map((word, wi) => {
        const grad = wi >= total - 2 ? " grad" : "";
        const inner = word
          .split("")
          .map((ch) => `<span class="char">${escapeHtml(ch)}</span>`)
          .join("");
        return `<span class="word${grad}">${inner}</span>`;
      })
      .join(" ");
    h1.dataset.split = "1";
  }

  // ─── Hero intro ───────────────────────────────────────────
  function initHeroIntro() {
    const tl = gsap.timeline({ delay: 0.08 });

    tl.fromTo(".hero__content > .eyebrow",
      { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.25);

    tl.fromTo(".hero__chips span",
      { y: 14, opacity: 0, scale: 0.94 },
      { y: 0, opacity: 1, scale: 1, duration: 0.55, stagger: 0.06, ease: "back.out(1.4)" }, 0.38);

    const chars = document.querySelectorAll(".hero h1 .char");
    if (chars.length) {
      gsap.set(chars, { yPercent: 110, opacity: 0 });
      tl.to(chars,
        { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.03, ease: "power3.out" }, 0.55);
    } else {
      tl.fromTo(".hero h1", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.55);
    }

    tl.fromTo(".hero__subtitle",
      { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 1.25);
    tl.fromTo(".hero__signal",
      { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 1.38);
    tl.fromTo(".hero__body",
      { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 1.5);
    tl.fromTo(".hero__actions .btn",
      { y: 14, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: "back.out(1.3)" }, 1.62);

    tl.fromTo(".hero__panel > .panel",
      { y: 40, opacity: 0, rotateX: 8 },
      { y: 0, opacity: 1, rotateX: 0, duration: 0.9, stagger: 0.12, transformPerspective: 1200 }, 0.8);

    tweens.push(tl);
  }

  // ─── Scroll reveals (generic) ─────────────────────────────
  function initScrollReveals() {
    if (!ScrollTrigger) return;
    const items = gsap.utils.toArray(".reveal:not(.hero__content):not(.hero__panel)");
    items.forEach((el) => {
      const fromLeft = el.classList.contains("reveal--from-left");
      const fromRight = el.classList.contains("reveal--from-right");
      const x = fromLeft ? -36 : fromRight ? 36 : 0;

      const tween = gsap.fromTo(el,
        { x, y: 40, opacity: 0 },
        {
          x: 0, y: 0, opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none"
          }
        }
      );
      tweens.push(tween);
    });
  }

  // ─── Section headings (underline draw via class) ──────────
  function initSectionHeadings() {
    if (!ScrollTrigger) return;
    document.querySelectorAll(".section-heading").forEach((heading) => {
      // Target each piece specifically — the eyebrow is the first <p>,
      // the description is the non-eyebrow <p>. Animating both is what
      // keeps the heading from reserving empty space below the h2.
      const eyebrow = heading.querySelector(".eyebrow");
      const h2 = heading.querySelector("h2");
      const desc = heading.querySelector("p:not(.eyebrow)");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heading,
          start: "top 85%",
          toggleActions: "play none none none"
        }
      });
      if (eyebrow) tl.fromTo(eyebrow, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 }, 0);
      if (h2)      tl.fromTo(h2,      { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85 }, 0.05);
      if (desc)    tl.fromTo(desc,    { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75 }, 0.15);
      tl.call(() => heading.classList.add("is-visible"), null, 0.3);
      tweens.push(tl);
    });
  }

  // ─── Bullet-list stagger ──────────────────────────────────
  function initStaggerBullets() {
    if (!ScrollTrigger) return;
    document.querySelectorAll(".bullet-list").forEach((list) => {
      const items = list.querySelectorAll("li");
      if (!items.length) return;
      const tween = gsap.fromTo(items,
        { y: 20, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 0.6,
          stagger: 0.06,
          ease: "power3.out",
          scrollTrigger: { trigger: list, start: "top 85%", toggleActions: "play none none none" }
        }
      );
      tweens.push(tween);
    });
  }

  // ─── Chip / tag stagger ───────────────────────────────────
  function initStaggerChips() {
    if (!ScrollTrigger) return;
    document.querySelectorAll(".chip-cloud, .tag-row").forEach((group) => {
      if (group.classList.contains("hero__chips")) return;
      const items = group.querySelectorAll("span");
      if (!items.length) return;
      const tween = gsap.fromTo(items,
        { y: 14, opacity: 0, scale: 0.92 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: 0.5,
          stagger: 0.05,
          ease: "back.out(1.4)",
          scrollTrigger: { trigger: group, start: "top 85%", toggleActions: "play none none none" }
        }
      );
      tweens.push(tween);
    });
  }

  // ─── Key-value row stagger ────────────────────────────────
  function initStaggerKeyValues() {
    if (!ScrollTrigger) return;
    document.querySelectorAll(".key-value-list").forEach((list) => {
      const items = list.querySelectorAll(".key-value-item");
      if (!items.length) return;
      const tween = gsap.fromTo(items,
        { y: 14, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 0.55,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: list, start: "top 88%", toggleActions: "play none none none" }
        }
      );
      tweens.push(tween);
    });
  }

  // ─── Metric card stagger ──────────────────────────────────
  function initStaggerMetrics() {
    if (!ScrollTrigger) return;
    const grids = document.querySelectorAll(".metric-grid");
    grids.forEach((grid) => {
      const items = grid.querySelectorAll(".metric-card");
      if (!items.length) return;
      // Hero metrics animate in during intro — skip scroll trigger if above fold
      const rect = grid.getBoundingClientRect();
      const isHero = rect.top < window.innerHeight && grid.closest(".hero");
      if (isHero) return;
      const tween = gsap.fromTo(items,
        { y: 18, opacity: 0, scale: 0.96 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: 0.65,
          stagger: 0.1,
          ease: "back.out(1.3)",
          scrollTrigger: { trigger: grid, start: "top 85%", toggleActions: "play none none none" }
        }
      );
      tweens.push(tween);
    });
  }

  // ─── Skill bar row stagger (opacity/transform only) ───────
  function initStaggerSkillBars() {
    if (!ScrollTrigger) return;
    document.querySelectorAll(".skill-bars").forEach((list) => {
      const bars = list.querySelectorAll(".skill-bar");
      if (!bars.length) return;
      const tween = gsap.fromTo(bars,
        { x: -20, opacity: 0 },
        {
          x: 0, opacity: 1,
          duration: 0.55,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: list, start: "top 82%", toggleActions: "play none none none" }
        }
      );
      tweens.push(tween);
    });
  }

  // ─── Role-card timeline fill (scrubbed on desktop, one-shot on touch) ─
  function initTimelineScrub() {
    if (!ScrollTrigger) return;
    const fill = document.querySelector(".role-timeline__fill");
    const roleCard = document.querySelector(".role-card");
    if (!fill || !roleCard) return;

    const tween = gsap.fromTo(fill,
      { width: "0%" },
      {
        width: "72%",
        ease: coarsePointer ? "power3.out" : "none",
        duration: coarsePointer ? 1.6 : undefined,
        scrollTrigger: coarsePointer
          ? { trigger: roleCard, start: "top 80%", toggleActions: "play none none none" }
          : { trigger: roleCard, start: "top 75%", end: "bottom 55%", scrub: 0.6 }
      }
    );
    tweens.push(tween);
  }

  // ─── Skill bar fills (scrubbed on desktop, one-shot on touch) ────
  function initSkillBarScrub() {
    if (!ScrollTrigger) return;
    document.querySelectorAll(".skill-bar[data-level]").forEach((bar) => {
      const fill = bar.querySelector(".skill-bar__fill");
      if (!fill) return;
      const level = parseInt(bar.dataset.level, 10);
      if (!Number.isFinite(level)) return;

      const tween = gsap.fromTo(fill,
        { width: "0%" },
        {
          width: `${level}%`,
          ease: coarsePointer ? "power3.out" : "none",
          duration: coarsePointer ? 1.2 : undefined,
          scrollTrigger: coarsePointer
            ? { trigger: bar, start: "top 88%", toggleActions: "play none none none" }
            : { trigger: bar, start: "top 88%", end: "top 45%", scrub: 0.5 }
        }
      );
      tweens.push(tween);
    });
  }

  // ─── Metric count-up (once on enter) ──────────────────────
  function initMetricCountUp() {
    const metrics = document.querySelectorAll(".metric-card strong[data-count]");
    if (!metrics.length) return;

    metrics.forEach((el) => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || "";
      if (!Number.isFinite(target)) return;
      el.textContent = "0" + suffix;
      const obj = { val: 0 };

      if (ScrollTrigger) {
        const tween = gsap.to(obj, {
          val: target,
          duration: 1.6,
          ease: "power3.out",
          onUpdate: () => { el.textContent = Math.round(obj.val) + suffix; },
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            toggleActions: "play none none none",
            once: true
          }
        });
        tweens.push(tween);
      } else {
        el.textContent = target + suffix;
      }
    });
  }

  // ─── Hero parallax on scroll ──────────────────────────────
  function initHeroParallax() {
    if (!ScrollTrigger || reducedMotion || coarsePointer) return;
    const content = document.querySelector(".hero__content");
    const panel = document.querySelector(".hero__panel");

    if (content) {
      tweens.push(gsap.to(content, {
        yPercent: -14,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.6
        }
      }));
    }
    if (panel) {
      tweens.push(gsap.to(panel, {
        yPercent: -8,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.6
        }
      }));
    }

    // Dot grid slight parallax
    const grid = document.querySelector(".dot-grid");
    if (grid) {
      tweens.push(gsap.to(grid, {
        "--gy": "40px",
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: true
        }
      }));
    }
  }

  // ─── Sticky header state on scroll ────────────────────────
  function initHeaderScrollState() {
    const header = document.querySelector(".site-header");
    if (!header || !ScrollTrigger) return;
    ScrollTrigger.create({
      trigger: document.body,
      start: "top+=40 top",
      onUpdate: (self) => {
        header.classList.toggle("is-scrolled", self.scroll() > 40);
      }
    });
  }

  // ─── Idle animations (continuous) ─────────────────────────
  function initIdleAnimations() {
    if (reducedMotion || coarsePointer) return;

    // Hero chips gentle float
    const chips = document.querySelectorAll(".hero__chips span");
    chips.forEach((chip, i) => {
      tweens.push(gsap.to(chip, {
        y: "-=3",
        duration: 1.8 + Math.random() * 0.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: i * 0.15
      }));
    });

    // Hero glow pulse
    tweens.push(gsap.to(".hero__glow", {
      scale: 1.08,
      opacity: 0.9,
      duration: 4.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    }));

    // Aurora breath — scale pulse
    const blobs = document.querySelectorAll(".aurora-blob");
    blobs.forEach((blob, i) => {
      tweens.push(gsap.to(blob, {
        "--scl": 1.08,
        duration: 5.5 + i * 0.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: i * 0.3
      }));
    });

    // Scan-line drifts down every ~12s
    const scanLine = document.querySelector(".scan-line");
    if (scanLine) {
      const scan = gsap.timeline({ repeat: -1, repeatDelay: 9 });
      scan.fromTo(scanLine,
        { "--scan-y": "-60%", opacity: 0 },
        { "--scan-y": "120%", opacity: 1, duration: 3.2, ease: "sine.inOut" })
        .to(scanLine, { opacity: 0, duration: 0.4 });
      tweens.push(scan);
    }
  }

  // ─── Orientation / viewport refresh ───────────────────────
  // iOS + Android fire `orientationchange` before the viewport
  // dimensions have stabilized, so ScrollTrigger's cached start/end
  // values become stale. Debounce a refresh so hero parallax, skill
  // bar scrubs, and section triggers realign to the new viewport.
  function initOrientationRefresh() {
    if (!ScrollTrigger) return;
    let timer = 0;

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        ScrollTrigger.refresh();
        // A second pass catches late viewport-height changes from
        // mobile browser chrome (URL bar show/hide) after rotation.
        window.setTimeout(() => ScrollTrigger.refresh(), 260);
      }, 180);
    };

    window.addEventListener("orientationchange", schedule);
    window.addEventListener("resize", schedule);

    triggers.push({
      kill: () => {
        window.clearTimeout(timer);
        window.removeEventListener("orientationchange", schedule);
        window.removeEventListener("resize", schedule);
      }
    });
  }
}

// ─── Fallback reveal (IntersectionObserver, no GSAP) ────────
function initFallbackReveals() {
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    document.querySelectorAll(".section-heading").forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".reveal, .section-heading").forEach((el) => observer.observe(el));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] || ch
  ));
}
