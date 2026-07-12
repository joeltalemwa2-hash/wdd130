// Shared behavior across all pages: nav toggle + dynamic footer year
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  const yearSpan = document.querySelector("#current-year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  const lastModified = document.querySelector("#last-modified");
  if (lastModified) lastModified.textContent = document.lastModified;
});

// ---------------------------------------------------------------------------
// Weather widget (home page only). Uses OpenWeatherMap if a key is supplied;
// otherwise falls back to representative seasonal data for Kampala so the
// layout always renders fully populated.
// ---------------------------------------------------------------------------
async function loadWeather() {
  const nowTemp = document.querySelector("#weather-temp");
  if (!nowTemp) return; // not on this page

  const FALLBACK = {
    temp: 24,
    desc: "Partly cloudy",
    high: 27,
    low: 18,
    humidity: 62,
    forecast: [
      { day: "Sun", temp: 25 },
      { day: "Mon", temp: 23 },
      { day: "Tue", temp: 26 },
    ],
  };

  const render = (data) => {
    document.querySelector("#weather-temp").textContent = `${Math.round(data.temp)}°C`;
    document.querySelector("#weather-desc").textContent = data.desc;
    document.querySelector("#weather-high").textContent = `${Math.round(data.high)}°`;
    document.querySelector("#weather-low").textContent = `${Math.round(data.low)}°`;
    document.querySelector("#weather-humidity").textContent = `${data.humidity}%`;
    const row = document.querySelector("#forecast-row");
    row.innerHTML = data.forecast
      .map(
        (f) => `<div class="forecast-day"><span class="d">${f.day}</span><span class="t">${Math.round(f.temp)}°</span></div>`
      )
      .join("");
  };

  const API_KEY = ""; // add an OpenWeatherMap key here to go live
  if (!API_KEY) {
    render(FALLBACK);
    return;
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Kampala,UG&units=metric&appid=${API_KEY}`
    );
    if (!res.ok) throw new Error("weather request failed");
    const json = await res.json();
    render({
      temp: json.main.temp,
      desc: json.weather[0].description,
      high: json.main.temp_max,
      low: json.main.temp_min,
      humidity: json.main.humidity,
      forecast: FALLBACK.forecast,
    });
  } catch (err) {
    console.warn("Falling back to seasonal weather data:", err);
    render(FALLBACK);
  }
}

loadWeather();