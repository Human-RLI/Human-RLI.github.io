/* HumanRLI 2026 (fancy, elegant style) — interactions */

/* theme toggle (persisted) */
(function () {
  const KEY = "hcrl-theme", root = document.documentElement;
  const saved = localStorage.getItem(KEY);
  if (saved) root.setAttribute("data-theme", saved);
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem(KEY, next);
  });
})();

/* mobile nav */
(function () {
  const t = document.getElementById("navToggle"), l = document.getElementById("navLinks");
  if (!t || !l) return;
  t.addEventListener("click", () => { const o = l.classList.toggle("open"); t.setAttribute("aria-expanded", String(o)); });
  l.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => l.classList.remove("open")));
})();

/* scroll reveal */
(function () {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((es) => es.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { threshold: 0.12 });
  els.forEach((e) => io.observe(e));
})();

/* scrollspy (active nav link) */
(function () {
  const links = [...document.querySelectorAll(".nav-links a")];
  const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const spy = new IntersectionObserver((es) => es.forEach((en) => {
    if (en.isIntersecting) { links.forEach((l) => l.classList.remove("active")); map.get(en.target.id)?.classList.add("active"); }
  }), { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("section[id], header[id]").forEach((s) => spy.observe(s));
})();

/* image fallback: gradient avatar with initials */
(function () {
  function placeholder(initials) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c8cff"/>' +
      '<stop offset="0.6" stop-color="#57e6c9"/><stop offset="1" stop-color="#ffd479"/></linearGradient></defs>' +
      '<rect width="220" height="220" fill="url(#g)"/><text x="50%" y="50%" dy="0.35em" text-anchor="middle" ' +
      'font-family="Space Grotesk, sans-serif" font-size="84" font-weight="700" fill="#0b0d12">' + initials + "</text></svg>";
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }
  document.querySelectorAll("img[data-initials]").forEach((img) => {
    const fail = () => { img.src = placeholder(img.dataset.initials || "?"); };
    img.addEventListener("error", fail, { once: true });
    if (img.complete && img.naturalWidth === 0) fail();
  });
})();
