// ============================================================
// Joel Talemwa — WDD 130 Home Page
// Small, dependency-free enhancements: mobile nav toggle
// and a subtle scroll-reveal for content sections.
// ============================================================

// ---- Mobile navigation toggle ----
const navToggle = document.getElementById("navToggle");
const primaryNav = document.getElementById("primaryNav");

if (navToggle && primaryNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = primaryNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Close the mobile menu after a nav link is tapped
  primaryNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      primaryNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// ---- Scroll reveal (skips animation if the user prefers reduced motion) ----
// Content is visible by default in the CSS. Only once we know we can both
// hide *and* reveal an element do we opt it into the animated state —
// this keeps the page fully readable if JS is disabled or fails to run.
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealEls = document.querySelectorAll(".reveal");

if (!prefersReducedMotion && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          entry.target.classList.remove("pre-reveal");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  revealEls.forEach((el) => {
    el.classList.add("pre-reveal");
    observer.observe(el);
  });
}
// If reduced motion is on, or IntersectionObserver isn't supported,
// elements simply stay at their default visible state — no action needed.
