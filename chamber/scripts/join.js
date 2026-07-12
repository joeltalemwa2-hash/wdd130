const TIER_DETAILS = {
  np: {
    title: "Nonprofit Membership",
    price: "Free",
    medalColor: "#1f5c46",
    benefits: [
      "Directory listing with nonprofit tag",
      "Access to networking events",
      "Quarterly community briefing",
    ],
  },
  bronze: {
    title: "Bronze Membership",
    price: "UGX 250,000 / year",
    medalColor: "#a6693a",
    benefits: [
      "Everything in Nonprofit",
      "Listing in printed member directory",
      "1 free event ticket per quarter",
      "Ribbon-cutting eligibility",
    ],
  },
  silver: {
    title: "Silver Membership",
    price: "UGX 600,000 / year",
    medalColor: "#9aa3a6",
    benefits: [
      "Everything in Bronze",
      "Featured business spotlight rotation",
      "Discounted expo booth rates",
      "Priority event seating",
    ],
  },
  gold: {
    title: "Gold Membership",
    price: "UGX 1,200,000 / year",
    medalColor: "#cc9a2e",
    benefits: [
      "Everything in Silver",
      "Homepage spotlight placement",
      "Complimentary expo booth",
      "One guest pass to every chamber event",
    ],
  },
};

function medalSVG(color) {
  return `<svg class="medal" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="26" r="20" fill="none" stroke="${color}" stroke-width="3"/>
    <circle cx="32" cy="26" r="13" fill="${color}" opacity="0.15"/>
    <path d="M32 15l3.6 7.4 8.2 1.1-5.9 5.7 1.4 8.1L32 33.5l-7.3 3.8 1.4-8.1-5.9-5.7 8.2-1.1L32 15Z" fill="${color}"/>
    <path d="M24 40l-4 12 12-5 12 5-4-12" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>
  </svg>`;
}

function openTierModal(tierKey) {
  const data = TIER_DETAILS[tierKey];
  if (!data) return;
  const modal = document.querySelector("#tier-modal");
  modal.querySelector("#modal-medal").innerHTML = medalSVG(data.medalColor);
  modal.querySelector("#modal-title").textContent = data.title;
  modal.querySelector("#modal-price").textContent = data.price;
  modal.querySelector("#modal-benefits").innerHTML = data.benefits.map((b) => `<li>${b}</li>`).join("");
  modal.showModal();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-tier]").forEach((card) => {
    const btn = card.querySelector(".learn-more");
    if (btn) btn.addEventListener("click", () => openTierModal(card.dataset.tier));
  });

  const modal = document.querySelector("#tier-modal");
  if (modal) {
    modal.querySelector(".modal-close").addEventListener("click", () => modal.close());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.close();
    });
  }

  // Timestamp the hidden field so the form records submission time, and let
  // the browser's own required/pattern validation handle the rest.
  const form = document.querySelector("#join-form");
  if (form) {
    form.addEventListener("submit", () => {
      const stamp = form.querySelector("#submitted-at");
      if (stamp) stamp.value = new Date().toISOString();
    });
  }
});