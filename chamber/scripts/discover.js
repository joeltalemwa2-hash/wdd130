const ICONS = {
  landmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 21h16M5 21V9l7-5 7 5v12M9 21v-6h6v6"/></svg>`,
  wave: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/></svg>`,
  basket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 10h16l-1.5 9a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 10Z"/><path d="M8 10 12 3l4 7M9 14v4M15 14v4"/></svg>`,
  museum: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 21h18M4 21V10M20 21V10M2 10l10-6 10 6M6 21v-7M10 21v-7M14 21v-7M18 21v-7"/></svg>`,
  church: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2v4m-2-2h4M6 21V11l6-4 6 4v10M10 21v-5h4v5M4 21h16"/></svg>`,
  drum: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="12" cy="7" rx="8" ry="3.5"/><path d="M4 7v9c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5V7"/></svg>`,
  storefront: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M4 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0M10 20v-6h4v6"/></svg>`,
};

const TINTS = ["var(--forest)", "var(--forest-lt)", "var(--gold-dk)", "var(--ink)"];

async function loadPlaces() {
  const grid = document.querySelector("#places-grid");
  if (!grid) return;

  try {
    const res = await fetch("data/places.json");
    if (!res.ok) throw new Error("Could not load places.json");
    const places = await res.json();

    grid.innerHTML = places
      .map((p, i) => {
        const icon = ICONS[p.icon] || ICONS.landmark;
        const tint = TINTS[i % TINTS.length];
        return `
        <article class="place-card">
          <div class="place-visual" style="background:${tint}">${icon}</div>
          <div class="place-body">
            <p class="kind">${p.kind}</p>
            <h3>${p.name}</h3>
            <p>${p.description}</p>
            <button class="btn btn-outline btn-small" type="button" data-name="${p.name}">Add to visit list</button>
          </div>
        </article>`;
      })
      .join("");
  } catch (err) {
    grid.innerHTML = `<p>Sorry — we couldn't load places right now. Please try again shortly.</p>`;
    console.error(err);
  }
}

// Last-visit banner using localStorage, per WDD231 discover-page pattern
function showVisitBanner() {
  const banner = document.querySelector("#visit-banner");
  if (!banner) return;

  const last = localStorage.getItem("chamberLastVisit");
  const now = Date.now();

  if (!last) {
    banner.textContent = "Welcome! This looks like your first visit to Discover Kampala — explore the spots below.";
  } else {
    const days = Math.floor((now - Number(last)) / (1000 * 60 * 60 * 24));
    if (days === 0) {
      banner.textContent = "Welcome back! You already stopped by earlier today.";
    } else if (days === 1) {
      banner.textContent = "Welcome back! Your last visit was 1 day ago.";
    } else {
      banner.textContent = `Welcome back! Your last visit was ${days} days ago.`;
    }
  }
  localStorage.setItem("chamberLastVisit", String(now));
}

loadPlaces();
showVisitBanner();