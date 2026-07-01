(() => {
  "use strict";

  /* ---------- Theme toggle ---------- */
  const themeToggle = document.getElementById("themeToggle");
  const root = document.body;
  const savedTheme = localStorage.getItem("learnup-theme");
  if (savedTheme) {
    root.dataset.theme = savedTheme;
  }
  const syncThemeButton = () => {
    const isLight = root.dataset.theme === "light";
    themeToggle.textContent = isLight ? "🌙" : "☀️";
    themeToggle.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
  };
  syncThemeButton();
  themeToggle.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    localStorage.setItem("learnup-theme", root.dataset.theme);
    syncThemeButton();
  });

  /* ---------- Mobile nav ---------- */
  const menuToggle = document.getElementById("menuToggle");
  const mobileNav = document.getElementById("mobileNav");
  menuToggle.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.textContent = isOpen ? "✕" : "☰";
  });
  mobileNav.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      mobileNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.textContent = "☰";
    })
  );

  /* ---------- Scroll reveal + progress bar fill + stat counters ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  const fillEls = document.querySelectorAll("[data-fill]");
  const countEls = document.querySelectorAll("[data-count]");

  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || "";
    const duration = 1100;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add("is-in");

        el.querySelectorAll("[data-fill]").forEach((bar) => {
          bar.style.width = prefersReducedMotion ? bar.dataset.fill + "%" : "0%";
          requestAnimationFrame(() => (bar.style.width = bar.dataset.fill + "%"));
        });
        if (el.hasAttribute("data-fill")) {
          requestAnimationFrame(() => (el.style.width = el.dataset.fill + "%"));
        }
        el.querySelectorAll("[data-count]").forEach((counter) => {
          if (!counter.dataset.done) {
            counter.dataset.done = "1";
            prefersReducedMotion
              ? (counter.textContent = counter.dataset.count + (counter.dataset.suffix || ""))
              : animateCount(counter);
          }
        });
        if (el.hasAttribute("data-count") && !el.dataset.done) {
          el.dataset.done = "1";
          prefersReducedMotion
            ? (el.textContent = el.dataset.count + (el.dataset.suffix || ""))
            : animateCount(el);
        }

        io.unobserve(el);
      });
    },
    { threshold: 0.2 }
  );

  revealEls.forEach((el) => io.observe(el));
  // Also observe direct fill/count elements not wrapped by a .reveal ancestor watch
  fillEls.forEach((el) => {
    if (!el.closest(".reveal")) io.observe(el);
  });
  countEls.forEach((el) => {
    if (!el.closest(".reveal")) io.observe(el);
  });

  /* ---------- Learning Materials (from data/materials.json) ---------- */
  const materialsGrid = document.getElementById("materialsGrid");
  const subjectFilters = document.getElementById("subjectFilters");
  const typeFilters = document.getElementById("typeFilters");

  const TYPE_META = {
    video: { icon: "🎥", label: "Video" },
    notes: { icon: "📝", label: "Notes" },
    pdf: { icon: "📄", label: "PDF" },
    "past-paper": { icon: "🧾", label: "Past Paper" },
    audio: { icon: "🎧", label: "Audio" },
  };

  let allMaterials = [];
  let activeSubject = "all";
  let activeType = "all";

  const materialCard = (m) => {
    const meta = TYPE_META[m.type] || { icon: "📁", label: m.type };
    return `
      <article class="material-card reveal is-in">
        <div class="material-top">
          <div class="material-icon" aria-hidden="true">${meta.icon}</div>
          <div>
            <div class="material-title">${m.title}</div>
            <div class="material-tags">
              <span class="material-tag">${m.subject}</span>
              <span class="material-tag">${m.level}</span>
              ${m.offline ? '<span class="material-tag offline">✓ Offline ready</span>' : ""}
            </div>
          </div>
        </div>
        <div class="material-meta">
          <span>${meta.label} · ${m.sizeMB} MB</span>
          <span>${m.source}</span>
        </div>
        <div class="material-actions">
          <a class="btn btn-primary btn-sm" href="${m.url}" target="_blank" rel="noopener">Open</a>
          <a class="btn btn-ghost btn-sm" href="${m.url}" download>Download</a>
        </div>
      </article>`;
  };

  const renderMaterials = () => {
    const filtered = allMaterials.filter(
      (m) =>
        (activeSubject === "all" || m.subject === activeSubject) &&
        (activeType === "all" || m.type === activeType)
    );
    materialsGrid.innerHTML = filtered.length
      ? filtered.map(materialCard).join("")
      : `<p class="materials-status">No materials match those filters yet. Try "All Subjects" or add new entries to data/materials.json.</p>`;
  };

  const buildSubjectFilters = () => {
    const subjects = [...new Set(allMaterials.map((m) => m.subject))].sort();
    subjects.forEach((subject) => {
      const btn = document.createElement("button");
      btn.className = "filter-chip";
      btn.dataset.filterSubject = subject;
      btn.textContent = subject;
      subjectFilters.appendChild(btn);
    });
  };

  const wireFilterGroup = (group, datasetKey, setActive) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      group.querySelectorAll(".filter-chip").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      setActive(btn.dataset[datasetKey]);
      renderMaterials();
    });
  };

  fetch("data/materials.json")
    .then((res) => {
      if (!res.ok) throw new Error("Could not load materials");
      return res.json();
    })
    .then((data) => {
      allMaterials = data.materials || [];
      buildSubjectFilters();
      wireFilterGroup(subjectFilters, "filterSubject", (v) => (activeSubject = v));
      wireFilterGroup(typeFilters, "filterType", (v) => (activeType = v));
      renderMaterials();
    })
    .catch(() => {
      materialsGrid.innerHTML = `<p class="materials-status">Materials couldn't be loaded right now. If you're offline, they'll appear once data/materials.json has been cached by visiting this page online once.</p>`;
    });

  /* ---------- Online / offline status banner ---------- */
  const banner = document.getElementById("statusBanner");
  let firstCheck = true;
  const updateStatus = () => {
    if (navigator.onLine) {
      if (!firstCheck) {
        banner.textContent = "✅ Back online — syncing your latest progress.";
        banner.classList.remove("is-offline");
        banner.classList.add("is-visible");
        setTimeout(() => banner.classList.remove("is-visible"), 3500);
      }
    } else {
      banner.textContent = "📡 You're offline — downloaded subjects still work fine.";
      banner.classList.add("is-offline", "is-visible");
    }
    firstCheck = false;
  };
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
  updateStatus();

  /* ---------- Install prompt ---------- */
  let deferredPrompt = null;
  const installToast = document.getElementById("installToast");
  const installBtn = document.getElementById("installBtn");
  const closeToast = document.getElementById("closeToast");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!sessionStorage.getItem("learnup-install-dismissed")) {
      installToast.classList.add("is-visible");
    }
  });

  installBtn?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installToast.classList.remove("is-visible");
  });

  closeToast?.addEventListener("click", () => {
    installToast.classList.remove("is-visible");
    sessionStorage.setItem("learnup-install-dismissed", "1");
  });

  window.addEventListener("appinstalled", () => {
    installToast.classList.remove("is-visible");
  });

  /* ---------- Service worker ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* offline-first app still works without SW registration succeeding */
      });
    });
  }
})();